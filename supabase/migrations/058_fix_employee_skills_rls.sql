-- =====================================================
-- Migration: Fix Employee Skills RLS Policies
-- Description: Ensure admin users can fully manage employee skills
--   including INSERT, UPDATE, and DELETE operations
-- =====================================================

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Admins can manage employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins can update any employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins can insert any employee skills" ON public.employee_skills;

-- Create comprehensive admin policy for ALL operations with both USING and WITH CHECK
CREATE POLICY "Admins can manage employee skills"
ON public.employee_skills
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Also ensure users can view their own skills
DROP POLICY IF EXISTS "All authenticated users can view employee skills" ON public.employee_skills;
CREATE POLICY "All authenticated users can view employee skills"
ON public.employee_skills
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow employees to update their own skill goals (is_goal field only)
DROP POLICY IF EXISTS "Employees can update own skill goals" ON public.employee_skills;
CREATE POLICY "Employees can update own skill goals"
ON public.employee_skills
FOR UPDATE
USING (
  employee_id = public.current_employee_id()
)
WITH CHECK (
  employee_id = public.current_employee_id()
);

-- Allow employees to insert their own skill goals
DROP POLICY IF EXISTS "Employees can insert own skill goals" ON public.employee_skills;
CREATE POLICY "Employees can insert own skill goals"
ON public.employee_skills
FOR INSERT
WITH CHECK (
  employee_id = public.current_employee_id()
);
