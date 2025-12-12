-- =====================================================
-- Allow all authenticated users to view employee skills
-- Required for roster, mentorship, and dashboard stats
-- =====================================================

-- Drop the restrictive policy (try both names in case migration was already run)
DROP POLICY IF EXISTS "Users can view own skills" ON public.employee_skills;
DROP POLICY IF EXISTS "Users can view their own skills" ON public.employee_skills;

-- Drop and recreate the permissive policy (CREATE POLICY IF NOT EXISTS is not valid PostgreSQL)
DROP POLICY IF EXISTS "All authenticated users can view employee skills" ON public.employee_skills;

-- Create new policy: All authenticated users can view all employee skills
CREATE POLICY "All authenticated users can view employee skills"
  ON public.employee_skills FOR SELECT
  USING (auth.uid() IS NOT NULL);
