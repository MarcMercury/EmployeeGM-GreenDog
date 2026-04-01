-- ============================================================================
-- MIGRATION 278: Compensation history tracking
-- Fixes gap: employee_compensation is 1:1 per employee with no effective_date
-- history. Mid-period pay raises overwrite the old rate, causing retroactive
-- miscalculation. This adds a history table and trigger to preserve old rates.
-- ============================================================================

-- 1. Create compensation history table
CREATE TABLE IF NOT EXISTS public.employee_compensation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_type TEXT NOT NULL DEFAULT 'Hourly',
  pay_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  employment_status TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL means current/active rate
  change_reason TEXT,
  changed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_history_employee ON public.employee_compensation_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_comp_history_effective ON public.employee_compensation_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_comp_history_active ON public.employee_compensation_history(employee_id, end_date)
  WHERE end_date IS NULL;

-- 2. RLS policies
ALTER TABLE public.employee_compensation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage compensation history" ON public.employee_compensation_history;
CREATE POLICY "Admins can manage compensation history"
ON public.employee_compensation_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'hr_admin')
  )
);

DROP POLICY IF EXISTS "Employees can view own compensation history" ON public.employee_compensation_history;
CREATE POLICY "Employees can view own compensation history"
ON public.employee_compensation_history
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- 3. Trigger: auto-archive old rate when employee_compensation is updated
CREATE OR REPLACE FUNCTION archive_compensation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only archive if pay_rate or pay_type actually changed
  IF OLD.pay_rate IS DISTINCT FROM NEW.pay_rate
     OR OLD.pay_type IS DISTINCT FROM NEW.pay_type THEN
    
    -- Close out the previous rate by setting end_date on the active history record
    UPDATE employee_compensation_history
    SET end_date = CURRENT_DATE
    WHERE employee_id = NEW.employee_id
      AND end_date IS NULL;

    -- Insert new history record for the new rate
    INSERT INTO employee_compensation_history (
      employee_id,
      pay_type,
      pay_rate,
      employment_status,
      effective_date,
      end_date,
      change_reason
    ) VALUES (
      NEW.employee_id,
      NEW.pay_type,
      NEW.pay_rate,
      NEW.employment_status,
      COALESCE(NEW.effective_date, CURRENT_DATE),
      NULL, -- current active rate
      'Rate changed from ' || OLD.pay_rate || ' to ' || NEW.pay_rate
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_archive_compensation ON employee_compensation;
CREATE TRIGGER trigger_archive_compensation
  AFTER UPDATE ON employee_compensation
  FOR EACH ROW
  EXECUTE FUNCTION archive_compensation_change();

-- 4. Backfill: create initial history record for all existing compensations
INSERT INTO employee_compensation_history (employee_id, pay_type, pay_rate, employment_status, effective_date, end_date)
SELECT
  employee_id,
  COALESCE(pay_type, 'Hourly'),
  COALESCE(pay_rate, 0),
  employment_status,
  COALESCE(effective_date, created_at::DATE),
  NULL
FROM employee_compensation
ON CONFLICT DO NOTHING;

-- 5. Grant access
GRANT SELECT ON public.employee_compensation_history TO authenticated;
GRANT INSERT, UPDATE ON public.employee_compensation_history TO authenticated;

COMMENT ON TABLE public.employee_compensation_history IS
  'Tracks historical pay rate changes per employee, enabling accurate mid-period payroll calculation';
