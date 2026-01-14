-- =====================================================
-- Migration 120: Training System Enhancements
-- Unifies course systems and adds manager sign-off
-- =====================================================

-- =====================================================
-- 1. ADD MANAGER SIGN-OFF TO TRAINING ENROLLMENTS
-- =====================================================

-- Add sign-off columns to training_enrollments
ALTER TABLE public.training_enrollments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  ADD COLUMN IF NOT EXISTS requires_signoff BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_notes TEXT,
  ADD COLUMN IF NOT EXISTS skill_awarded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for sign-off pending
CREATE INDEX IF NOT EXISTS idx_training_enrollments_pending_signoff 
  ON public.training_enrollments(requires_signoff, signoff_at) 
  WHERE requires_signoff = true AND signoff_at IS NULL;

COMMENT ON COLUMN public.training_enrollments.requires_signoff IS 'If true, manager must approve completion before skill is awarded';
COMMENT ON COLUMN public.training_enrollments.signoff_by IS 'Manager who approved the course completion';
COMMENT ON COLUMN public.training_enrollments.skill_awarded IS 'True if the skill level has been granted from this course';

-- =====================================================
-- 2. ADD CONTENT COLUMNS TO TRAINING_LESSONS
-- =====================================================

-- Add content type flexibility to training_lessons
ALTER TABLE public.training_lessons
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'pdf', 'embed', 'quiz')),
  ADD COLUMN IF NOT EXISTS content_payload JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS est_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS requires_completion BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.training_lessons.content_type IS 'Type of content: text, video, pdf, embed, quiz';
COMMENT ON COLUMN public.training_lessons.content_payload IS 'Flexible JSON for content URLs, settings, etc';

-- =====================================================
-- 3. FIX SKILL ADVANCEMENT TRIGGER
-- Now handles both completion AND optional manager sign-off
-- =====================================================

CREATE OR REPLACE FUNCTION public.apply_course_skill_advancement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill_id UUID;
  v_skill_level INTEGER;
  v_employee_id UUID;
  v_requires_signoff BOOLEAN;
  v_profile_id UUID;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the course's skill info
    SELECT skill_id, skill_level_awarded INTO v_skill_id, v_skill_level
    FROM public.training_courses
    WHERE id = NEW.course_id;
    
    -- If this course awards a skill level
    IF v_skill_id IS NOT NULL AND v_skill_level IS NOT NULL THEN
      
      -- Check if sign-off is required
      v_requires_signoff := COALESCE(NEW.requires_signoff, false);
      
      -- If sign-off required but not signed, skip skill award (will be done on sign-off)
      IF v_requires_signoff AND NEW.signoff_at IS NULL THEN
        RETURN NEW;
      END IF;
      
      -- Get the profile_id for this employee
      SELECT profile_id INTO v_profile_id
      FROM public.employees
      WHERE id = NEW.employee_id;
      
      IF v_profile_id IS NOT NULL THEN
        -- Upsert the employee's skill level (only if improvement)
        INSERT INTO public.employee_skills (employee_id, skill_id, level, certified_at, rating, verified_at, verified_by)
        VALUES (
          v_profile_id,  -- Use profile_id, not employee_id
          v_skill_id, 
          v_skill_level, 
          NOW(),
          v_skill_level,  -- Also set rating
          NOW(),
          NEW.signoff_by  -- Use the sign-off manager if available
        )
        ON CONFLICT (employee_id, skill_id) 
        DO UPDATE SET 
          level = GREATEST(employee_skills.level, EXCLUDED.level),
          rating = GREATEST(COALESCE(employee_skills.rating, 0), EXCLUDED.rating),
          certified_at = CASE WHEN EXCLUDED.level > employee_skills.level THEN NOW() ELSE employee_skills.certified_at END,
          verified_at = CASE WHEN EXCLUDED.level > employee_skills.level THEN NOW() ELSE employee_skills.verified_at END,
          verified_by = CASE WHEN EXCLUDED.level > employee_skills.level THEN EXCLUDED.verified_by ELSE employee_skills.verified_by END,
          updated_at = NOW();
        
        -- Mark skill as awarded
        UPDATE public.training_enrollments
        SET skill_awarded = true
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_course_skill_advancement ON public.training_enrollments;
CREATE TRIGGER trigger_course_skill_advancement
  AFTER UPDATE ON public.training_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_course_skill_advancement();

-- =====================================================
-- 4. MANAGER SIGN-OFF FUNCTION
-- Called when manager approves a course completion
-- =====================================================

CREATE OR REPLACE FUNCTION public.signoff_course_completion(
  p_enrollment_id UUID,
  p_signoff_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_skill_id UUID;
  v_skill_level INTEGER;
  v_profile_id UUID;
BEGIN
  -- Get enrollment
  SELECT * INTO v_enrollment
  FROM public.training_enrollments
  WHERE id = p_enrollment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enrollment not found');
  END IF;
  
  IF v_enrollment.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course must be completed before sign-off');
  END IF;
  
  IF v_enrollment.signoff_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already signed off');
  END IF;
  
  -- Update enrollment with sign-off
  UPDATE public.training_enrollments
  SET 
    signoff_by = p_signoff_by,
    signoff_at = NOW(),
    signoff_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_enrollment_id;
  
  -- Get course skill info
  SELECT skill_id, skill_level_awarded INTO v_skill_id, v_skill_level
  FROM public.training_courses
  WHERE id = v_enrollment.course_id;
  
  -- If course awards a skill, apply it now
  IF v_skill_id IS NOT NULL AND v_skill_level IS NOT NULL THEN
    -- Get profile_id for employee
    SELECT profile_id INTO v_profile_id
    FROM public.employees
    WHERE id = v_enrollment.employee_id;
    
    IF v_profile_id IS NOT NULL THEN
      -- Award the skill
      INSERT INTO public.employee_skills (employee_id, skill_id, level, rating, certified_at, verified_at, verified_by)
      VALUES (v_profile_id, v_skill_id, v_skill_level, v_skill_level, NOW(), NOW(), p_signoff_by)
      ON CONFLICT (employee_id, skill_id) 
      DO UPDATE SET 
        level = GREATEST(employee_skills.level, EXCLUDED.level),
        rating = GREATEST(COALESCE(employee_skills.rating, 0), EXCLUDED.rating),
        certified_at = NOW(),
        verified_at = NOW(),
        verified_by = p_signoff_by,
        updated_at = NOW();
      
      -- Mark skill awarded
      UPDATE public.training_enrollments
      SET skill_awarded = true
      WHERE id = p_enrollment_id;
      
      RETURN jsonb_build_object(
        'success', true, 
        'message', 'Course signed off and skill awarded',
        'skill_id', v_skill_id,
        'skill_level', v_skill_level
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Course signed off');
END;
$$;

GRANT EXECUTE ON FUNCTION public.signoff_course_completion(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- 5. ASSIGN COURSE FUNCTIONS (for training_courses)
-- Similar to course_enrollments but for legacy system
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_training_course_to_employee(
  p_course_id UUID,
  p_employee_id UUID,
  p_due_date DATE DEFAULT NULL,
  p_assigned_by UUID DEFAULT NULL,
  p_requires_signoff BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_id UUID;
BEGIN
  INSERT INTO public.training_enrollments (
    course_id,
    employee_id,
    due_date,
    assigned_by,
    requires_signoff,
    status
  )
  VALUES (
    p_course_id,
    p_employee_id,
    p_due_date,
    p_assigned_by,
    p_requires_signoff,
    'enrolled'
  )
  ON CONFLICT (employee_id, course_id) 
  DO UPDATE SET
    due_date = COALESCE(EXCLUDED.due_date, training_enrollments.due_date),
    updated_at = NOW()
  RETURNING id INTO v_enrollment_id;
  
  RETURN v_enrollment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_training_course_to_employee(UUID, UUID, DATE, UUID, BOOLEAN) TO authenticated;

-- Assign to all active employees
CREATE OR REPLACE FUNCTION public.assign_training_course_to_all(
  p_course_id UUID,
  p_due_days INTEGER DEFAULT 30,
  p_assigned_by UUID DEFAULT NULL,
  p_requires_signoff BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.training_enrollments (course_id, employee_id, due_date, assigned_by, requires_signoff, status)
  SELECT 
    p_course_id,
    e.id,
    CURRENT_DATE + p_due_days,
    p_assigned_by,
    p_requires_signoff,
    'enrolled'
  FROM public.employees e
  JOIN public.profiles p ON p.id = e.profile_id
  WHERE p.is_active = true
    AND p.role NOT IN ('admin', 'super_admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.training_enrollments te
      WHERE te.course_id = p_course_id AND te.employee_id = e.id
    )
  ON CONFLICT (employee_id, course_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_training_course_to_all(UUID, INTEGER, UUID, BOOLEAN) TO authenticated;

-- Assign to department
CREATE OR REPLACE FUNCTION public.assign_training_course_to_department(
  p_course_id UUID,
  p_department TEXT,
  p_due_days INTEGER DEFAULT 30,
  p_assigned_by UUID DEFAULT NULL,
  p_requires_signoff BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.training_enrollments (course_id, employee_id, due_date, assigned_by, requires_signoff, status)
  SELECT 
    p_course_id,
    e.id,
    CURRENT_DATE + p_due_days,
    p_assigned_by,
    p_requires_signoff,
    'enrolled'
  FROM public.employees e
  JOIN public.profiles p ON p.id = e.profile_id
  WHERE e.department_id = p_department
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.training_enrollments te
      WHERE te.course_id = p_course_id AND te.employee_id = e.id
    )
  ON CONFLICT (employee_id, course_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_training_course_to_department(UUID, TEXT, INTEGER, UUID, BOOLEAN) TO authenticated;

-- Smart assign based on skill gap
CREATE OR REPLACE FUNCTION public.smart_assign_training_course(
  p_course_id UUID,
  p_skill_threshold INTEGER DEFAULT 3,
  p_due_days INTEGER DEFAULT 30,
  p_assigned_by UUID DEFAULT NULL,
  p_requires_signoff BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Get the skill linked to this course
  SELECT skill_id INTO v_skill_id
  FROM public.training_courses
  WHERE id = p_course_id;
  
  IF v_skill_id IS NULL THEN
    RAISE EXCEPTION 'Course has no linked skill for smart assignment';
  END IF;
  
  -- Insert enrollments for users with skill gap
  INSERT INTO public.training_enrollments (course_id, employee_id, due_date, assigned_by, requires_signoff, status)
  SELECT 
    p_course_id,
    e.id,
    CURRENT_DATE + p_due_days,
    p_assigned_by,
    p_requires_signoff,
    'enrolled'
  FROM public.employees e
  JOIN public.profiles p ON p.id = e.profile_id
  LEFT JOIN public.employee_skills es ON es.employee_id = p.id AND es.skill_id = v_skill_id
  WHERE p.is_active = true
    AND p.role NOT IN ('admin', 'super_admin')
    AND (es.rating IS NULL OR es.rating < p_skill_threshold)
    AND NOT EXISTS (
      SELECT 1 FROM public.training_enrollments te
      WHERE te.course_id = p_course_id AND te.employee_id = e.id
    )
  ON CONFLICT (employee_id, course_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.smart_assign_training_course(UUID, INTEGER, INTEGER, UUID, BOOLEAN) TO authenticated;

-- =====================================================
-- 6. UPDATE PROGRESS FUNCTION
-- Updates enrollment when lesson is completed
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_training_enrollment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_progress INTEGER;
  v_course_id UUID;
BEGIN
  -- Get course_id from the lesson
  SELECT course_id INTO v_course_id
  FROM public.training_lessons
  WHERE id = NEW.lesson_id;
  
  -- Count total lessons in course
  SELECT COUNT(*) INTO v_total_lessons
  FROM public.training_lessons
  WHERE course_id = v_course_id;
  
  -- Count completed lessons for this employee
  SELECT COUNT(*) INTO v_completed_lessons
  FROM public.training_progress tp
  JOIN public.training_lessons tl ON tl.id = tp.lesson_id
  WHERE tl.course_id = v_course_id
    AND tp.employee_id = NEW.employee_id
    AND tp.completed_at IS NOT NULL;
  
  -- Calculate progress
  IF v_total_lessons > 0 THEN
    v_progress := (v_completed_lessons * 100) / v_total_lessons;
  ELSE
    v_progress := 0;
  END IF;
  
  -- Update enrollment
  UPDATE public.training_enrollments
  SET 
    progress_percent = v_progress,
    status = CASE 
      WHEN v_progress >= 100 THEN 'completed'
      WHEN v_progress > 0 THEN 'in_progress'
      ELSE status
    END,
    completed_at = CASE WHEN v_progress >= 100 THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE employee_id = NEW.employee_id
    AND course_id = v_course_id;
  
  RETURN NEW;
END;
$$;

-- Trigger for progress updates
DROP TRIGGER IF EXISTS trigger_update_training_enrollment_progress ON public.training_progress;
CREATE TRIGGER trigger_update_training_enrollment_progress
  AFTER INSERT OR UPDATE ON public.training_progress
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_training_enrollment_progress();

-- =====================================================
-- 7. GET PENDING SIGNOFFS VIEW
-- For managers to see what needs approval
-- =====================================================

CREATE OR REPLACE VIEW public.pending_course_signoffs AS
SELECT 
  te.id AS enrollment_id,
  te.course_id,
  tc.title AS course_title,
  tc.skill_id,
  sl.name AS skill_name,
  tc.skill_level_awarded,
  te.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  te.completed_at,
  te.progress_percent,
  te.requires_signoff,
  te.signoff_by,
  te.signoff_at,
  e.department_id,
  e.manager_employee_id
FROM public.training_enrollments te
JOIN public.training_courses tc ON tc.id = te.course_id
JOIN public.employees e ON e.id = te.employee_id
LEFT JOIN public.skill_library sl ON sl.id = tc.skill_id
WHERE te.status = 'completed'
  AND te.requires_signoff = true
  AND te.signoff_at IS NULL;

GRANT SELECT ON public.pending_course_signoffs TO authenticated;

-- =====================================================
-- 8. ENSURE STORAGE BUCKET EXISTS
-- =====================================================

-- Note: Run this in Dashboard or with admin API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'training-content', 
--   'training-content', 
--   true,
--   52428800, -- 50MB
--   ARRAY['application/pdf', 'video/mp4', 'video/webm', 'image/png', 'image/jpeg', 'image/gif']
-- )
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON SCHEMA public IS 'Training System Enhanced - Manager sign-off, skill advancement, unified course system';
