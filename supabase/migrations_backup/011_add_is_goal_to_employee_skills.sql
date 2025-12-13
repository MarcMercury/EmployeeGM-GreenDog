-- =====================================================
-- Migration 011: Add is_goal column to employee_skills
-- Purpose: Allow employees to mark skills as learning goals
--          for mentorship matching
-- =====================================================

ALTER TABLE public.employee_skills
ADD COLUMN IF NOT EXISTS is_goal BOOLEAN DEFAULT false;

-- Create index for faster goal lookups
CREATE INDEX IF NOT EXISTS idx_employee_skills_is_goal 
ON public.employee_skills(employee_id, is_goal) 
WHERE is_goal = true;

-- Comment for documentation
COMMENT ON COLUMN public.employee_skills.is_goal IS 'True if employee has marked this skill as a learning goal for mentorship';
