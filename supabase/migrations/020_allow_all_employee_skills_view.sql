-- =====================================================
-- Allow all authenticated users to view employee skills
-- Required for roster, mentorship, and dashboard stats
-- =====================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own skills" ON public.employee_skills;

-- Create new policy: All authenticated users can view all employee skills
CREATE POLICY "All authenticated users can view employee skills"
  ON public.employee_skills FOR SELECT
  USING (auth.uid() IS NOT NULL);
