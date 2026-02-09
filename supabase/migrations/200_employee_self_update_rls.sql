-- Add self-update RLS policies for employees and employee_licenses
-- This was needed because migration 181 removed the original self-update policy
-- Applied: 2026-02-09

-- Allow employees to update their own record
DROP POLICY IF EXISTS "employees_self_update" ON public.employees;

CREATE POLICY "employees_self_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- Allow users to insert licenses for their own employee record
DROP POLICY IF EXISTS "employee_licenses_self_insert" ON public.employee_licenses;
DROP POLICY IF EXISTS "employee_licenses_self_update" ON public.employee_licenses;

CREATE POLICY "employee_licenses_self_insert"
ON public.employee_licenses
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM public.employees e 
    JOIN public.profiles p ON e.profile_id = p.id 
    WHERE p.auth_user_id = auth.uid()
  )
);

CREATE POLICY "employee_licenses_self_update"
ON public.employee_licenses
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e 
    JOIN public.profiles p ON e.profile_id = p.id 
    WHERE p.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM public.employees e 
    JOIN public.profiles p ON e.profile_id = p.id 
    WHERE p.auth_user_id = auth.uid()
  )
);
