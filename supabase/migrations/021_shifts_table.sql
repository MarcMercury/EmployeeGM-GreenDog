-- =============================================
-- Migration: Create Shifts Table for Schedule Builder
-- =============================================

-- Shifts table for schedule management
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Location
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  
  -- Assignment
  assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  role_required TEXT, -- e.g., 'vet', 'technician', 'receptionist'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed_clinic')),
  is_published BOOLEAN DEFAULT false,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient week queries
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON public.shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_location_id ON public.shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_assigned_employee ON public.shifts(assigned_employee_id);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Policies

-- All authenticated users can view published shifts
CREATE POLICY "Authenticated users can view published shifts"
  ON public.shifts FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_published = true
  );

-- Admins can view ALL shifts (including unpublished drafts)
CREATE POLICY "Admins can view all shifts"
  ON public.shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Admins can insert shifts
CREATE POLICY "Admins can create shifts"
  ON public.shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Admins can update shifts
CREATE POLICY "Admins can update shifts"
  ON public.shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Admins can delete shifts
CREATE POLICY "Admins can delete shifts"
  ON public.shifts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_updated_at();

-- =============================================
-- Seed some sample shifts for testing
-- =============================================

-- Note: Run these after you have locations in the database
-- This creates shifts for the current week

DO $$
DECLARE
  loc_id UUID;
  current_date DATE := CURRENT_DATE;
  week_start DATE := date_trunc('week', current_date)::DATE;
  i INTEGER;
BEGIN
  -- Get first location
  SELECT id INTO loc_id FROM public.locations LIMIT 1;
  
  IF loc_id IS NOT NULL THEN
    -- Create shifts for each day of the week
    FOR i IN 0..6 LOOP
      -- Morning shift (8am - 12pm)
      INSERT INTO public.shifts (start_time, end_time, location_id, status)
      VALUES (
        (week_start + i) + INTERVAL '8 hours',
        (week_start + i) + INTERVAL '12 hours',
        loc_id,
        'open'
      );
      
      -- Afternoon shift (1pm - 5pm)
      INSERT INTO public.shifts (start_time, end_time, location_id, status)
      VALUES (
        (week_start + i) + INTERVAL '13 hours',
        (week_start + i) + INTERVAL '17 hours',
        loc_id,
        'open'
      );
    END LOOP;
    
    RAISE NOTICE 'Created 14 sample shifts for the current week';
  ELSE
    RAISE NOTICE 'No locations found - skipping shift seeding';
  END IF;
END $$;
