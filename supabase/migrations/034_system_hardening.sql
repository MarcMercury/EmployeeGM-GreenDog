-- =====================================================
-- Migration 034: System Hardening & Audit Fixes
-- December 2024
-- =====================================================

-- =====================================================
-- 1. MISSING RLS POLICIES: Ensure all tables have proper RLS
-- =====================================================

-- PTO Balances: Users should view their own
DROP POLICY IF EXISTS "Users can view own pto balances" ON public.pto_balances;
CREATE POLICY "Users can view own pto balances" ON public.pto_balances 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage pto balances" ON public.pto_balances;
CREATE POLICY "Admins can manage pto balances" ON public.pto_balances 
  FOR ALL 
  USING (public.is_admin());

-- Shift Assignments: Users can view their own
ALTER TABLE IF EXISTS public.shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shift assignments" ON public.shift_assignments;
CREATE POLICY "Users can view own shift assignments" ON public.shift_assignments 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage shift assignments" ON public.shift_assignments;
CREATE POLICY "Admins can manage shift assignments" ON public.shift_assignments 
  FOR ALL 
  USING (public.is_admin());

-- Employee Notes: Users can view their own, admins all
DROP POLICY IF EXISTS "Users can view own notes" ON public.employee_notes;
CREATE POLICY "Users can view own notes" ON public.employee_notes 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage employee notes" ON public.employee_notes;
CREATE POLICY "Admins can manage employee notes" ON public.employee_notes 
  FOR ALL 
  USING (public.is_admin());

-- Employee Pay Settings: Users can view their own, admins manage
DROP POLICY IF EXISTS "Users can view own pay settings" ON public.employee_pay_settings;
CREATE POLICY "Users can view own pay settings" ON public.employee_pay_settings 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

-- Employee Licenses: Users can view their own
DROP POLICY IF EXISTS "Users can view own licenses" ON public.employee_licenses;
CREATE POLICY "Users can view own licenses" ON public.employee_licenses 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

-- Employee CE Credits: Users can view their own
DROP POLICY IF EXISTS "Users can view own ce credits" ON public.employee_ce_credits;
CREATE POLICY "Users can view own ce credits" ON public.employee_ce_credits 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

-- Employee CE Transactions: Users can view their own  
DROP POLICY IF EXISTS "Users can view own ce transactions" ON public.employee_ce_transactions;
CREATE POLICY "Users can view own ce transactions" ON public.employee_ce_transactions 
  FOR SELECT 
  USING (employee_id = public.current_employee_id() OR public.is_admin());

-- =====================================================
-- 2. EMPLOYEE SKILLS: Allow employees to set goals
-- =====================================================
DROP POLICY IF EXISTS "Employees can update own skill goals" ON public.employee_skills;
CREATE POLICY "Employees can update own skill goals" ON public.employee_skills 
  FOR UPDATE 
  USING (employee_id = public.current_employee_id())
  WITH CHECK (employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "Employees can insert own skill goals" ON public.employee_skills;
CREATE POLICY "Employees can insert own skill goals" ON public.employee_skills 
  FOR INSERT 
  WITH CHECK (employee_id = public.current_employee_id());

-- =====================================================
-- 3. COMPANY SETTINGS: All authenticated can view
-- =====================================================
DROP POLICY IF EXISTS "All authenticated can view company settings" ON public.company_settings;
CREATE POLICY "All authenticated can view company settings" ON public.company_settings 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
CREATE POLICY "Admins can manage company settings" ON public.company_settings 
  FOR ALL 
  USING (public.is_admin());

-- =====================================================
-- 4. FIX DATA TYPES: Ensure consistent typing
-- =====================================================

-- Ensure wage/rate columns are numeric
DO $$
BEGIN
  -- Check if hourly_rate is text and convert
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_pay_settings' 
    AND column_name = 'hourly_rate' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.employee_pay_settings 
    ALTER COLUMN hourly_rate TYPE NUMERIC USING hourly_rate::numeric;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_pay_settings' 
    AND column_name = 'annual_salary' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.employee_pay_settings 
    ALTER COLUMN annual_salary TYPE NUMERIC USING annual_salary::numeric;
  END IF;
END $$;

-- =====================================================
-- 5. CASCADE DELETE SETUP: Ensure proper cleanup
-- =====================================================

-- Add ON DELETE CASCADE to employee-related tables if not exists
-- This is handled via foreign key constraints which are already defined

-- =====================================================
-- 6. OPTIMISTIC LOCKING: Add version column for concurrent edits
-- =====================================================

-- Add version column to schedules for optimistic locking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.schedules ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add version column to shifts for optimistic locking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shifts' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Function to increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version increment triggers
DROP TRIGGER IF EXISTS schedules_version_increment ON public.schedules;
CREATE TRIGGER schedules_version_increment
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS shifts_version_increment ON public.shifts;
CREATE TRIGGER shifts_version_increment
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE (70+ users)
-- =====================================================

-- Employees: Common queries
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON public.employees(location_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(employment_status);

-- Shifts: Time-based queries
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON public.shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_location ON public.shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date_employee ON public.shifts(shift_date, employee_id);

-- Time off requests: Employee + status
CREATE INDEX IF NOT EXISTS idx_time_off_employee ON public.time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON public.time_off_requests(status);

-- Employee skills: Employee + skill
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON public.employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON public.employee_skills(skill_id);

-- Notifications: Profile + read status
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(profile_id) WHERE is_read = false;

-- Schedules: Date range queries
CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON public.schedules(employee_id);

-- Training enrollments
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON public.training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_course ON public.training_enrollments(course_id);

-- =====================================================
-- 8. CANDIDATE TO EMPLOYEE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_candidate_hired()
RETURNS TRIGGER AS $$
BEGIN
  -- When a candidate's status changes to 'hired', we don't auto-create employee
  -- The hiring process should be explicit via the hireCandidate utility
  -- This trigger is for audit logging only
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN
    INSERT INTO public.audit_logs (
      table_name, 
      record_id, 
      action, 
      old_values, 
      new_values, 
      performed_by
    ) VALUES (
      'candidates',
      NEW.id,
      'status_change_hired',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'hired_at', NOW()),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_candidate_hired ON public.candidates;
CREATE TRIGGER on_candidate_hired
  AFTER UPDATE ON public.candidates
  FOR EACH ROW
  WHEN (NEW.status = 'hired')
  EXECUTE FUNCTION public.handle_candidate_hired();

-- =====================================================
-- 9. MARKETING RESOURCES TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketing_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  folder_path TEXT DEFAULT '',
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view resources" ON public.marketing_resources;
CREATE POLICY "All authenticated can view resources" ON public.marketing_resources 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage resources" ON public.marketing_resources;
CREATE POLICY "Admins can manage resources" ON public.marketing_resources 
  FOR ALL 
  USING (public.is_admin());

-- =====================================================
-- 10. MARKETING VENDORS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketing_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  category TEXT,
  website TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'preferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view vendors" ON public.marketing_vendors;
CREATE POLICY "All authenticated can view vendors" ON public.marketing_vendors 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage vendors" ON public.marketing_vendors;
CREATE POLICY "Admins can manage vendors" ON public.marketing_vendors 
  FOR ALL 
  USING (public.is_admin());

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.marketing_resources TO authenticated;
GRANT ALL ON public.marketing_vendors TO authenticated;
GRANT SELECT ON public.marketing_resources TO anon;
GRANT SELECT ON public.marketing_vendors TO anon;
