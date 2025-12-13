-- =====================================================
-- Migration 034: Fix employee_skills RLS policies
-- Issue: The old restrictive policy "Users can view their own skills" 
-- was not dropped due to name mismatch in migration 020
-- =====================================================

-- Drop the old restrictive policy that was never dropped
DROP POLICY IF EXISTS "Users can view their own skills" ON public.employee_skills;

-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "All authenticated users can view employee skills" ON public.employee_skills;

-- Create the permissive policy
CREATE POLICY "All authenticated users can view employee skills"
  ON public.employee_skills FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed employee_skills RLS policies - all authenticated users can now view skills';
END $$;
