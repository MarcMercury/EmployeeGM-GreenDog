-- =====================================================
-- EMPLOYEE CHANGE LOG - Admin Audit Trail
-- Migration: 110_employee_change_log.sql
-- Description:
--   - Track all changes made to employee profiles via Master Roster
--   - Admin-only viewable audit trail
--   - Stores old/new values for each field changed
--   - Add missing employee address and emergency contact fields
-- =====================================================

-- =====================================================
-- 0. ADD MISSING FIELDS TO EMPLOYEES TABLE
-- =====================================================

-- Address fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address_zip TEXT;

-- Emergency contact fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

COMMENT ON COLUMN public.employees.address_street IS 'Employee home address street';
COMMENT ON COLUMN public.employees.address_city IS 'Employee home address city';
COMMENT ON COLUMN public.employees.address_state IS 'Employee home address state';
COMMENT ON COLUMN public.employees.address_zip IS 'Employee home address ZIP code';
COMMENT ON COLUMN public.employees.emergency_contact_name IS 'Emergency contact name';
COMMENT ON COLUMN public.employees.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN public.employees.emergency_contact_relationship IS 'Relationship to emergency contact';

-- =====================================================
-- 1. EMPLOYEE CHANGE LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Who made the change
  changed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT, -- Stored for audit even if user is deleted
  
  -- Which employee was changed
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL, -- Stored for audit
  
  -- What was changed
  table_name TEXT NOT NULL, -- 'employees', 'employee_compensation', 'profiles'
  field_name TEXT NOT NULL,
  field_label TEXT, -- Human-readable label
  
  -- Old and new values
  old_value TEXT,
  new_value TEXT,
  
  -- Context
  change_source TEXT DEFAULT 'master_roster' CHECK (change_source IN (
    'master_roster', 'profile_edit', 'api', 'system', 'import'
  )),
  change_note TEXT -- Optional note about why the change was made
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_change_log_employee_id ON public.employee_change_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_change_log_created_at ON public.employee_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_change_log_changed_by ON public.employee_change_log(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_change_log_table_name ON public.employee_change_log(table_name);
CREATE INDEX IF NOT EXISTS idx_employee_change_log_field_name ON public.employee_change_log(field_name);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.employee_change_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "employee_change_log_admin_select" ON public.employee_change_log;
DROP POLICY IF EXISTS "employee_change_log_admin_insert" ON public.employee_change_log;

-- Only admins can view change logs
CREATE POLICY "employee_change_log_admin_select" ON public.employee_change_log
  FOR SELECT USING (public.is_admin());

-- Only admins can insert change logs
CREATE POLICY "employee_change_log_admin_insert" ON public.employee_change_log
  FOR INSERT WITH CHECK (public.is_admin());

-- No updates or deletes allowed - audit trail is immutable
-- (Super admins can still delete via service role if absolutely necessary)

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON public.employee_change_log TO authenticated;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.employee_change_log IS 'Audit trail of all changes made to employee records via Master Roster';
COMMENT ON COLUMN public.employee_change_log.changed_by_name IS 'Stored name for audit trail even if user is later deleted';
COMMENT ON COLUMN public.employee_change_log.employee_name IS 'Stored employee name for audit trail even if employee is deleted';
COMMENT ON COLUMN public.employee_change_log.field_label IS 'Human-readable label for display (e.g., "Pay Rate" instead of "pay_rate")';
COMMENT ON COLUMN public.employee_change_log.change_source IS 'Where the change originated from';

-- =====================================================
-- 6. HELPER VIEW FOR EASY QUERYING
-- =====================================================

CREATE OR REPLACE VIEW public.employee_change_log_view AS
SELECT 
  ecl.*,
  p.first_name || ' ' || p.last_name AS changed_by_display_name,
  p.avatar_url AS changed_by_avatar
FROM public.employee_change_log ecl
LEFT JOIN public.profiles p ON p.id = ecl.changed_by_profile_id
ORDER BY ecl.created_at DESC;

COMMENT ON VIEW public.employee_change_log_view IS 'View of change log with changer display info';
