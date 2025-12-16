-- =====================================================
-- MIGRATION 041: Course-to-Skill Linking
-- =====================================================
-- Allows courses to be tied to skills, and completing
-- a course can advance an employee's skill level.
-- =====================================================

-- Add skill linking columns to training_courses
ALTER TABLE public.training_courses 
  ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES public.skill_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skill_level_awarded INTEGER CHECK (skill_level_awarded >= 1 AND skill_level_awarded <= 5),
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create index for skill lookups
CREATE INDEX IF NOT EXISTS idx_training_courses_skill ON public.training_courses(skill_id);

-- Add comment
COMMENT ON COLUMN public.training_courses.skill_id IS 'Optional link to skill_library - completing this course improves this skill';
COMMENT ON COLUMN public.training_courses.skill_level_awarded IS 'The skill level (1-5) the employee achieves upon completion';

-- =====================================================
-- RLS Policies for updated training_courses
-- =====================================================

-- Anyone can view active courses
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.training_courses;
CREATE POLICY "Anyone can view active courses" ON public.training_courses
  FOR SELECT USING (is_active = true OR public.is_admin());

-- Admins can manage courses
DROP POLICY IF EXISTS "Admins can manage courses" ON public.training_courses;
CREATE POLICY "Admins can manage courses" ON public.training_courses
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- Update employee_skills RLS for admin editing
-- =====================================================

-- Allow admins to update any employee's skills
DROP POLICY IF EXISTS "Admins can update any employee skills" ON public.employee_skills;
CREATE POLICY "Admins can update any employee skills" ON public.employee_skills
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow admins to insert skills for any employee
DROP POLICY IF EXISTS "Admins can insert any employee skills" ON public.employee_skills;
CREATE POLICY "Admins can insert any employee skills" ON public.employee_skills
  FOR INSERT WITH CHECK (public.is_admin());

-- Function to auto-update skill level when course is completed
CREATE OR REPLACE FUNCTION public.apply_course_skill_advancement()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_id UUID;
  v_skill_level INTEGER;
  v_employee_id UUID;
BEGIN
  -- Only trigger on completion
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the course's skill info
    SELECT skill_id, skill_level_awarded INTO v_skill_id, v_skill_level
    FROM public.training_courses
    WHERE id = NEW.course_id;
    
    -- If this course awards a skill level
    IF v_skill_id IS NOT NULL AND v_skill_level IS NOT NULL THEN
      -- Upsert the employee's skill level (only if improvement)
      INSERT INTO public.employee_skills (employee_id, skill_id, level, certified_at)
      VALUES (NEW.employee_id, v_skill_id, v_skill_level, NOW())
      ON CONFLICT (employee_id, skill_id) 
      DO UPDATE SET 
        level = GREATEST(employee_skills.level, EXCLUDED.level),
        certified_at = CASE WHEN EXCLUDED.level > employee_skills.level THEN NOW() ELSE employee_skills.certified_at END,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for course completion
DROP TRIGGER IF EXISTS trigger_course_skill_advancement ON public.training_enrollments;
CREATE TRIGGER trigger_course_skill_advancement
  AFTER UPDATE ON public.training_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_course_skill_advancement();
