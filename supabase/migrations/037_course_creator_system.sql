-- Migration: Course Creator System
-- Comprehensive LMS structure for scalable training content (293+ courses)

-- =====================================================
-- 1. COURSES TABLE (The Container)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image_url text,
  skill_id uuid REFERENCES public.skill_library(id) ON DELETE SET NULL,
  est_minutes integer DEFAULT 15,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_skill_id ON public.courses(skill_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);

-- RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all courses"
  ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.courses IS 'Training courses - containers for learning modules';

-- =====================================================
-- 2. COURSE MODULES TABLE (The Content)
-- =====================================================
CREATE TYPE module_type AS ENUM ('video', 'pdf', 'rich_text', 'embed', 'quiz');

CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_type module_type NOT NULL DEFAULT 'rich_text',
  title text NOT NULL,
  content_payload jsonb DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  est_minutes integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for modules
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON public.course_modules(course_id, order_index);

-- RLS for course_modules
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules visible with course access"
  ON public.course_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_modules.course_id
      AND (c.is_published = true OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can manage modules"
  ON public.course_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.course_modules IS 'Learning modules within courses - videos, PDFs, text, embeds';
COMMENT ON COLUMN public.course_modules.content_payload IS 'Flexible JSONB: video={provider,url}, pdf={path}, rich_text={html}, embed={url,type}';

-- =====================================================
-- 3. QUIZ QUESTIONS TABLE (The Test)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  points integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_course_id ON public.quiz_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON public.quiz_questions(course_id, order_index);

-- RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions visible with course access"
  ON public.quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quiz_questions.course_id
      AND (c.is_published = true OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can manage questions"
  ON public.quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.quiz_questions IS 'Quiz questions for course assessments';

-- =====================================================
-- 4. QUIZ OPTIONS TABLE (The Answers)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON public.quiz_options(question_id);

-- RLS
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Options visible with question access"
  ON public.quiz_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_options.question_id
      AND (c.is_published = true OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can manage options"
  ON public.quiz_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.quiz_options IS 'Answer options for quiz questions';

-- =====================================================
-- 5. COURSE ENROLLMENTS TABLE (The Assignments)
-- =====================================================
CREATE TYPE enrollment_status AS ENUM ('assigned', 'in_progress', 'completed', 'overdue');

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status enrollment_status DEFAULT 'assigned',
  due_date timestamptz,
  assigned_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  quiz_score integer CHECK (quiz_score >= 0 AND quiz_score <= 100),
  quiz_attempts integer DEFAULT 0,
  last_module_id uuid REFERENCES public.course_modules(id) ON DELETE SET NULL,
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate enrollments
  UNIQUE(course_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_due_date ON public.course_enrollments(due_date) WHERE status != 'completed';

-- RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own enrollment progress"
  ON public.course_enrollments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON public.course_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.course_enrollments IS 'User course assignments and progress tracking';

-- =====================================================
-- 6. QUIZ ATTEMPTS TABLE (Track Quiz History)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  passed boolean DEFAULT false,
  answers jsonb DEFAULT '[]',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment ON public.quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);

-- RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON public.quiz_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts"
  ON public.quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.quiz_attempts IS 'Quiz attempt history for auditing and retakes';

-- =====================================================
-- 7. MODULE COMPLETIONS TABLE (Track Progress)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  time_spent_seconds integer DEFAULT 0,
  
  UNIQUE(enrollment_id, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_completions_enrollment ON public.module_completions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_user ON public.module_completions(user_id);

-- RLS
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own completions"
  ON public.module_completions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all completions"
  ON public.module_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.module_completions IS 'Track which modules users have completed';

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to update enrollment progress automatically
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS trigger AS $$
DECLARE
  total_modules integer;
  completed_modules integer;
  new_progress integer;
BEGIN
  -- Count total modules in course
  SELECT COUNT(*) INTO total_modules
  FROM public.course_modules cm
  JOIN public.course_enrollments ce ON ce.course_id = cm.course_id
  WHERE ce.id = NEW.enrollment_id;
  
  -- Count completed modules
  SELECT COUNT(*) INTO completed_modules
  FROM public.module_completions
  WHERE enrollment_id = NEW.enrollment_id;
  
  -- Calculate progress
  IF total_modules > 0 THEN
    new_progress := (completed_modules * 100) / total_modules;
  ELSE
    new_progress := 0;
  END IF;
  
  -- Update enrollment
  UPDATE public.course_enrollments
  SET 
    progress_percent = new_progress,
    status = CASE 
      WHEN new_progress >= 100 THEN 'completed'::enrollment_status
      WHEN new_progress > 0 THEN 'in_progress'::enrollment_status
      ELSE status
    END,
    last_module_id = NEW.module_id,
    updated_at = now()
  WHERE id = NEW.enrollment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for progress updates
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON public.module_completions;
CREATE TRIGGER trigger_update_enrollment_progress
  AFTER INSERT ON public.module_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_progress();

-- Function to smart assign courses based on skill gaps
CREATE OR REPLACE FUNCTION smart_assign_course(
  p_course_id uuid,
  p_skill_threshold integer DEFAULT 3,
  p_due_days integer DEFAULT 30,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_skill_id uuid;
  v_assigned_count integer := 0;
BEGIN
  -- Get the skill linked to this course
  SELECT skill_id INTO v_skill_id
  FROM public.courses
  WHERE id = p_course_id;
  
  IF v_skill_id IS NULL THEN
    RAISE EXCEPTION 'Course has no linked skill for smart assignment';
  END IF;
  
  -- Insert enrollments for users with skill gap
  INSERT INTO public.course_enrollments (course_id, user_id, due_date, assigned_by)
  SELECT 
    p_course_id,
    p.id,
    now() + (p_due_days || ' days')::interval,
    p_assigned_by
  FROM public.profiles p
  LEFT JOIN public.employee_skills es ON es.employee_id = p.id AND es.skill_id = v_skill_id
  WHERE p.is_active = true
    AND p.role != 'admin'
    AND (es.rating IS NULL OR es.rating < p_skill_threshold)
    AND NOT EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id AND ce.user_id = p.id
    )
  ON CONFLICT (course_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  
  RETURN v_assigned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION smart_assign_course IS 'Auto-assign course to users with skill rating below threshold';

-- Function to assign course to everyone
CREATE OR REPLACE FUNCTION assign_course_to_all(
  p_course_id uuid,
  p_due_days integer DEFAULT 30,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_assigned_count integer := 0;
BEGIN
  INSERT INTO public.course_enrollments (course_id, user_id, due_date, assigned_by)
  SELECT 
    p_course_id,
    p.id,
    now() + (p_due_days || ' days')::interval,
    p_assigned_by
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.role != 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id AND ce.user_id = p.id
    )
  ON CONFLICT (course_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  
  RETURN v_assigned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign course to department
CREATE OR REPLACE FUNCTION assign_course_to_department(
  p_course_id uuid,
  p_department text,
  p_due_days integer DEFAULT 30,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  v_assigned_count integer := 0;
BEGIN
  INSERT INTO public.course_enrollments (course_id, user_id, due_date, assigned_by)
  SELECT 
    p_course_id,
    e.id,
    now() + (p_due_days || ' days')::interval,
    p_assigned_by
  FROM public.employees e
  JOIN public.profiles p ON p.id = e.id
  WHERE e.department = p_department
    AND p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = p_course_id AND ce.user_id = e.id
    )
  ON CONFLICT (course_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  
  RETURN v_assigned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_course_modules_updated_at ON public.course_modules;
CREATE TRIGGER trigger_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_course_enrollments_updated_at ON public.course_enrollments;
CREATE TRIGGER trigger_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 10. STORAGE BUCKET FOR COURSE ASSETS
-- =====================================================
-- Note: Run this in Supabase Dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('course-assets', 'course-assets', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON SCHEMA public IS 'Course Creator System v1.0 - Scalable LMS with 7 tables, smart assignment, progress tracking';
