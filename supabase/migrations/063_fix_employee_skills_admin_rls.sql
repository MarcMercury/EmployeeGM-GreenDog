-- =====================================================
-- Migration: Fix Employee Skills RLS for Admin Operations
-- Description: Create explicit INSERT/UPDATE/DELETE policies for admins
--   to ensure upsert operations work correctly
-- =====================================================

-- First, drop all existing employee_skills policies to start fresh
DROP POLICY IF EXISTS "Admins can manage employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins can update any employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins can insert any employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Admins can delete any employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "All authenticated users can view employee skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Employees can update own skill goals" ON public.employee_skills;
DROP POLICY IF EXISTS "Employees can insert own skill goals" ON public.employee_skills;
DROP POLICY IF EXISTS "admin_employee_skills_all" ON public.employee_skills;

-- Ensure RLS is enabled
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY 1: All authenticated users can SELECT
-- =====================================================
CREATE POLICY "employee_skills_select"
ON public.employee_skills
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- POLICY 2: Admins can INSERT (explicit policy)
-- =====================================================
CREATE POLICY "employee_skills_admin_insert"
ON public.employee_skills
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- =====================================================
-- POLICY 3: Admins can UPDATE (explicit policy)
-- =====================================================
CREATE POLICY "employee_skills_admin_update"
ON public.employee_skills
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- POLICY 4: Admins can DELETE (explicit policy)
-- =====================================================
CREATE POLICY "employee_skills_admin_delete"
ON public.employee_skills
FOR DELETE
TO authenticated
USING (public.is_admin());

-- =====================================================
-- POLICY 5: Employees can update their own skill goals
-- =====================================================
CREATE POLICY "employee_skills_self_update"
ON public.employee_skills
FOR UPDATE
TO authenticated
USING (employee_id = public.current_employee_id())
WITH CHECK (employee_id = public.current_employee_id());

-- =====================================================
-- POLICY 6: Employees can insert their own skill goals
-- =====================================================
CREATE POLICY "employee_skills_self_insert"
ON public.employee_skills
FOR INSERT
TO authenticated
WITH CHECK (employee_id = public.current_employee_id());

-- =====================================================
-- Grant table permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_skills TO authenticated;
