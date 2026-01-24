-- Migration: Restore sup_admin (Supervisor) role
-- Description: Adds sup_admin role to role_definitions and page_access tables
-- This role was accidentally removed by migration 155
-- ALREADY APPLIED VIA REST API on 2025-01-24

-- Insert sup_admin into role_definitions (if not exists)
INSERT INTO public.role_definitions (role_key, display_name, tier, description, icon, color, permissions)
VALUES ('sup_admin', 'Supervisor', 55, 'Supervisor access - HR, Recruiting, Schedules', 'mdi-account-supervisor', 'teal', '{"hr": true, "recruiting": true, "schedules": true, "education": true}'::jsonb)
ON CONFLICT (role_key) DO UPDATE SET
  display_name = 'Supervisor',
  tier = 55,
  description = 'Supervisor access - HR, Recruiting, Schedules',
  icon = 'mdi-account-supervisor',
  color = 'teal';

-- Add page_access records for sup_admin by copying from hr_admin
-- The supervisor role has the same access as hr_admin
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT 
  pa.page_id,
  'sup_admin',
  pa.access_level
FROM public.page_access pa
WHERE pa.role_key = 'hr_admin'
ON CONFLICT (page_id, role_key) DO UPDATE SET
  access_level = EXCLUDED.access_level;

-- Update the profiles table constraint to include sup_admin if not already
-- (This was already done in migration 154, but let's ensure it's there)
DO $$
BEGIN
  -- Check if sup_admin is in the constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_role_check'
    AND check_clause LIKE '%sup_admin%'
  ) THEN
    -- Drop and recreate the constraint with sup_admin
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'));
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.role_definitions IS 'Role definitions with sup_admin restored - Updated 2025-01-24';
