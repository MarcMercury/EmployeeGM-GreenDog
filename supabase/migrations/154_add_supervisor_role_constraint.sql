-- Migration 154: Add sup_admin (Supervisor) to profiles role constraint
-- 
-- The role_definitions table has a 'sup_admin' role but the profiles table
-- CHECK constraint doesn't include it, causing errors when assigning this role.

-- Update the CHECK constraint to include all roles from role_definitions
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'super_admin', 
  'admin', 
  'manager', 
  'hr_admin', 
  'office_admin', 
  'marketing_admin', 
  'sup_admin',  -- Supervisor role (was missing)
  'user'
));

-- Note: If additional roles are added to role_definitions in the future,
-- this constraint will need to be updated as well.
