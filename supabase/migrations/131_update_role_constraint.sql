-- =====================================================
-- MIGRATION 131: Update Profiles Role Constraint for RBAC
-- =====================================================
-- This migration updates the role check constraint on profiles table
-- to include the new manager and hr_admin roles.
-- =====================================================

-- Drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with all roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'));

-- Verify the constraint
DO $$
BEGIN
  RAISE NOTICE 'Updated profiles_role_check constraint to include: super_admin, admin, manager, hr_admin, office_admin, marketing_admin, user';
END $$;
