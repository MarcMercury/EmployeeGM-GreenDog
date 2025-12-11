-- =====================================================
-- Migration 022: Fix Schedule & Time Off Mismatches
-- Creates missing tables and fixes column issues
-- =====================================================

-- =====================================================
-- 1. CREATE SCHEDULES TABLE (for schedule.vue compatibility)
-- The 'shifts' table is for actual worked shifts
-- The 'schedules' table is for planned/assigned work schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who this schedule is for
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Date and shift info
  date DATE NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'full-day', 'off', 'on-call')),
  start_time TIME,
  end_time TIME,
  
  -- Location assignment
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_profile ON public.schedules(profile_id);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON public.schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_location ON public.schedules(location_id);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own schedules
CREATE POLICY "Users can view their own schedules"
  ON public.schedules FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR
    employee_id IN (SELECT id FROM employees WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  );

-- Admins can view all schedules
CREATE POLICY "Admins can view all schedules"
  ON public.schedules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Admins can manage schedules
CREATE POLICY "Admins can manage schedules"
  ON public.schedules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 2. ADD MISSING COLUMNS TO TIME_OFF_REQUESTS
-- =====================================================

-- Add reason column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_off_requests' AND column_name = 'reason'
  ) THEN
    ALTER TABLE public.time_off_requests ADD COLUMN reason TEXT;
  END IF;
END $$;

-- Add profile_id column if it doesn't exist (links to profiles for easy access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_off_requests' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.time_off_requests ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on profile_id
CREATE INDEX IF NOT EXISTS idx_time_off_profile ON public.time_off_requests(profile_id);

-- =====================================================
-- 3. ENSURE DEFAULT TIME OFF TYPES EXIST
-- =====================================================

INSERT INTO public.time_off_types (name, code, requires_approval, is_paid)
VALUES 
  ('Vacation', 'VAC', true, true),
  ('Sick Leave', 'SICK', false, true),
  ('Personal', 'PTO', true, true),
  ('Bereavement', 'BRV', false, true),
  ('Jury Duty', 'JURY', false, true),
  ('Unpaid Leave', 'UNPAID', true, false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 4. UPDATE RLS FOR TIME_OFF_REQUESTS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can view all time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Users can create time off requests" ON public.time_off_requests;
DROP POLICY IF EXISTS "Admins can update time off requests" ON public.time_off_requests;

-- Users can view their own
CREATE POLICY "Users can view their own time off requests"
  ON public.time_off_requests FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
    OR
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Admins can view all
CREATE POLICY "Admins can view all time off requests"
  ON public.time_off_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Users can create their own
CREATE POLICY "Users can create time off requests"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

-- Admins can update any
CREATE POLICY "Admins can update time off requests"
  ON public.time_off_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. ADD TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for schedules
DROP TRIGGER IF EXISTS update_schedules_modtime ON public.schedules;
CREATE TRIGGER update_schedules_modtime
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- 6. VIEW: Easy schedule view with employee names
-- =====================================================

CREATE OR REPLACE VIEW public.schedule_with_names AS
SELECT 
  s.*,
  p.first_name,
  p.last_name,
  p.email,
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
  l.name as location_name
FROM public.schedules s
LEFT JOIN public.profiles p ON s.profile_id = p.id
LEFT JOIN public.locations l ON s.location_id = l.id;
