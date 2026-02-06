-- ============================================================
-- SIMPLIFY PTO TO 3 TYPES: PTO, Unpaid Time Off, Other
-- Add assigned_hours and balance calculation support
-- ============================================================

-- 1. Add new columns to employee_time_off_balances if they don't exist
DO $$ 
BEGIN
  -- Add assigned_hours (total allocated/accrued for the year)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_time_off_balances' 
    AND column_name = 'assigned_hours'
  ) THEN
    ALTER TABLE public.employee_time_off_balances 
    ADD COLUMN assigned_hours NUMERIC DEFAULT 0;
  END IF;

  -- Add used_hours (total used/spent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_time_off_balances' 
    AND column_name = 'used_hours'
  ) THEN
    ALTER TABLE public.employee_time_off_balances 
    ADD COLUMN used_hours NUMERIC DEFAULT 0;
  END IF;

  -- Rename year to period_year if not already done
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_time_off_balances' 
    AND column_name = 'year'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_time_off_balances' 
    AND column_name = 'period_year'
  ) THEN
    ALTER TABLE public.employee_time_off_balances 
    RENAME COLUMN year TO period_year;
  END IF;

  -- Add period_year if neither exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_time_off_balances' 
    AND column_name = 'period_year'
  ) THEN
    ALTER TABLE public.employee_time_off_balances 
    ADD COLUMN period_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
  END IF;
END $$;

-- 2. Deactivate old time off types (keep data but mark as inactive)
DO $$ 
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_off_types' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.time_off_types 
    ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Mark old types as inactive (keep for historical data)
UPDATE public.time_off_types 
SET is_active = false 
WHERE code NOT IN ('PTO', 'UNPAID');

-- 3. Ensure we have the 3 core types
INSERT INTO public.time_off_types (name, code, requires_approval, is_paid, default_hours_per_day, is_active)
VALUES 
  ('PTO', 'PTO', true, true, 8, true),
  ('Unpaid Time Off', 'UNPAID', true, false, 8, true),
  ('Other', 'OTHER', true, false, 8, true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- 4. Create a function to calculate used PTO hours from approved time_off_requests
CREATE OR REPLACE FUNCTION public.calculate_pto_used_hours(
  p_employee_id UUID,
  p_time_off_type_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_total_used NUMERIC DEFAULT 0;
BEGIN
  SELECT COALESCE(SUM(duration_hours), 0) INTO v_total_used
  FROM public.time_off_requests
  WHERE employee_id = p_employee_id
    AND time_off_type_id = p_time_off_type_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN v_total_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to sync used_hours from approved time_off_requests
CREATE OR REPLACE FUNCTION public.sync_pto_used_hours() RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_used_hours NUMERIC;
BEGIN
  -- Determine year from the request
  IF TG_OP = 'DELETE' THEN
    v_year := EXTRACT(YEAR FROM OLD.start_date)::INTEGER;
  ELSE
    v_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  END IF;

  -- Calculate new used hours
  IF TG_OP = 'DELETE' OR OLD.status = 'approved' OR NEW.status = 'approved' THEN
    IF TG_OP = 'DELETE' THEN
      v_used_hours := public.calculate_pto_used_hours(OLD.employee_id, OLD.time_off_type_id, v_year);
      
      -- Update the balance record
      UPDATE public.employee_time_off_balances
      SET used_hours = v_used_hours,
          updated_at = NOW()
      WHERE employee_id = OLD.employee_id
        AND time_off_type_id = OLD.time_off_type_id
        AND period_year = v_year;
    ELSE
      v_used_hours := public.calculate_pto_used_hours(NEW.employee_id, NEW.time_off_type_id, v_year);
      
      -- Insert or update the balance record
      INSERT INTO public.employee_time_off_balances (
        employee_id, time_off_type_id, period_year, used_hours, assigned_hours
      )
      VALUES (
        NEW.employee_id, NEW.time_off_type_id, v_year, v_used_hours, 0
      )
      ON CONFLICT (employee_id, time_off_type_id, period_year) 
      DO UPDATE SET 
        used_hours = v_used_hours,
        updated_at = NOW();
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to auto-sync used_hours
DROP TRIGGER IF EXISTS sync_pto_used_hours_trigger ON public.time_off_requests;

CREATE TRIGGER sync_pto_used_hours_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.time_off_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_pto_used_hours();

-- 7. Update unique constraint to support period_year
ALTER TABLE public.employee_time_off_balances 
DROP CONSTRAINT IF EXISTS employee_time_off_balances_employee_id_time_off_type_id_year_key;

-- Add new unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_time_off_balances_emp_type_year_unique'
  ) THEN
    ALTER TABLE public.employee_time_off_balances
    ADD CONSTRAINT employee_time_off_balances_emp_type_year_unique 
    UNIQUE (employee_id, time_off_type_id, period_year);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- Constraint already exists
  NULL;
END $$;

-- 8. Backfill used_hours for existing approved requests
UPDATE public.employee_time_off_balances b
SET used_hours = (
  SELECT COALESCE(SUM(r.duration_hours), 0)
  FROM public.time_off_requests r
  WHERE r.employee_id = b.employee_id
    AND r.time_off_type_id = b.time_off_type_id
    AND r.status = 'approved'
    AND EXTRACT(YEAR FROM r.start_date) = b.period_year
)
WHERE used_hours IS NULL OR used_hours = 0;

-- 9. Set assigned_hours from existing balance_hours or accrued_hours
UPDATE public.employee_time_off_balances
SET assigned_hours = COALESCE(
  (SELECT balance_hours FROM public.employee_time_off_balances b2 WHERE b2.id = employee_time_off_balances.id),
  0
)
WHERE assigned_hours IS NULL OR assigned_hours = 0;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_pto_used_hours TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pto_used_hours TO authenticated;

-- 11. Add comment for documentation
COMMENT ON FUNCTION public.calculate_pto_used_hours IS 
'Calculates total used PTO hours for an employee from approved time_off_requests';

COMMENT ON FUNCTION public.sync_pto_used_hours IS 
'Trigger function to auto-sync used_hours when time_off_requests are modified';
