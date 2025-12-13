-- =====================================================
-- Allow all authenticated users to view all employees
-- Required for dashboard stats, roster view, etc.
-- =====================================================

-- Drop the restrictive "users can only view their own" policy
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;

-- Create new policy: All authenticated users can view all employees
CREATE POLICY "All authenticated users can view employees"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep admin-only for INSERT/UPDATE/DELETE (already exists via "Admins can manage employees")
