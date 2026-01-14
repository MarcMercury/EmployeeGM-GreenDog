-- =====================================================
-- Migration 121: Student Program Extension Table
-- =====================================================
-- Description: Adds "Education Program Hat" to the unified
-- person architecture. Enables tracking of:
--   - Internships (12-month paid program)
--   - Externships/Rotations (2-8 weeks)
--   - Paid Cohorts (structured learning)
--   - Student Intensives (short-term immersion)
--
-- Architecture:
--   unified_persons (Core Identity)
--   ├── person_crm_data (Marketing - CE Course Attendees)
--   ├── person_program_data (NEW - Education Programs)
--   ├── person_recruiting_data (Job Applications)
--   └── person_employee_data (Employment)
-- =====================================================

-- =====================================================
-- STEP 1: PROGRAM TYPE ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE education_program_type AS ENUM (
    'internship',      -- 12-month paid internship program
    'externship',      -- 2-8 week externship/rotation
    'paid_cohort',     -- Paid structured learning cohort
    'intensive',       -- Short-term intensive training
    'shadow',          -- Job shadowing (typically 1 day)
    'ce_course'        -- Continuing education course participant
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE program_enrollment_status AS ENUM (
    'inquiry',         -- Initial inquiry, not yet applied
    'applied',         -- Application submitted
    'reviewing',       -- Under review
    'interview',       -- In interview process
    'accepted',        -- Accepted, pending enrollment
    'enrolled',        -- Actively enrolled
    'in_progress',     -- Program in progress
    'completed',       -- Successfully completed program
    'withdrawn',       -- Student withdrew
    'dismissed',       -- Removed from program
    'deferred',        -- Deferred to future cohort
    'waitlisted'       -- On waitlist
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: PERSON_PROGRAM_DATA (Education Hat)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.person_program_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- ========== PROGRAM CLASSIFICATION ==========
  program_type education_program_type NOT NULL,
  enrollment_status program_enrollment_status NOT NULL DEFAULT 'inquiry',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- ========== PROGRAM DETAILS ==========
  program_name TEXT,                    -- Specific program name (e.g., "RVT Internship 2025")
  cohort_identifier TEXT,               -- Cohort code (e.g., "2025-Q1", "Spring-2025")
  start_date DATE,
  end_date DATE,
  expected_graduation_date DATE,
  actual_completion_date DATE,
  
  -- ========== ACADEMIC SOURCE ==========
  school_of_origin TEXT,                -- University/School name
  school_program TEXT,                  -- Their academic program (e.g., "Veterinary Technology")
  academic_advisor TEXT,
  school_coordinator_email TEXT,
  school_coordinator_phone TEXT,
  
  -- ========== ASSIGNMENT ==========
  assigned_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  assigned_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_mentor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_coordinator_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- ========== SCHEDULE ==========
  schedule_type TEXT CHECK (schedule_type IN ('full_time', 'part_time', 'flexible', 'custom')),
  scheduled_hours_per_week INTEGER,
  schedule_notes TEXT,
  schedule_data JSONB DEFAULT '{}'::jsonb, -- Detailed schedule if needed
  
  -- ========== COMPENSATION (for paid programs) ==========
  is_paid BOOLEAN DEFAULT false,
  stipend_amount NUMERIC(10,2),
  stipend_frequency TEXT CHECK (stipend_frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly')),
  payment_method TEXT,
  payment_notes TEXT,
  
  -- ========== APPLICATION DATA ==========
  applied_at TIMESTAMPTZ,
  application_source TEXT,              -- Where they found us
  application_data JSONB DEFAULT '{}'::jsonb, -- Full application form data
  resume_url TEXT,
  cover_letter_url TEXT,
  transcript_url TEXT,
  additional_documents JSONB DEFAULT '[]'::jsonb,
  
  -- ========== EVALUATION & PROGRESS ==========
  entrance_evaluation_score NUMERIC(5,2),
  entrance_evaluation_notes TEXT,
  midpoint_evaluation_score NUMERIC(5,2),
  midpoint_evaluation_notes TEXT,
  final_evaluation_score NUMERIC(5,2),
  final_evaluation_notes TEXT,
  overall_performance_rating TEXT CHECK (overall_performance_rating IN (
    'exceptional', 'exceeds_expectations', 'meets_expectations', 
    'needs_improvement', 'unsatisfactory'
  )),
  
  -- ========== LEARNING OBJECTIVES ==========
  learning_objectives JSONB DEFAULT '[]'::jsonb, -- Array of objectives with completion status
  competencies_achieved JSONB DEFAULT '[]'::jsonb, -- Skills/competencies gained
  hours_completed NUMERIC(10,2) DEFAULT 0,
  hours_required NUMERIC(10,2),
  
  -- ========== OUTCOMES ==========
  completion_certificate_issued BOOLEAN DEFAULT false,
  certificate_issued_at TIMESTAMPTZ,
  eligible_for_employment BOOLEAN,
  employment_interest_level TEXT CHECK (employment_interest_level IN (
    'very_interested', 'interested', 'undecided', 'not_interested'
  )),
  converted_to_employee BOOLEAN DEFAULT false,
  employee_conversion_date DATE,
  converted_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- ========== NOTES & FEEDBACK ==========
  program_notes TEXT,
  student_feedback TEXT,
  coordinator_notes TEXT,
  exit_survey_completed BOOLEAN DEFAULT false,
  exit_survey_data JSONB,
  
  -- ========== METADATA ==========
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Link to legacy education_visitors record if migrated
  legacy_visitor_id UUID REFERENCES public.education_visitors(id) ON DELETE SET NULL
);

-- Note: Unlike other extensions, a person CAN have multiple program records
-- (e.g., completed an externship, then enrolled in internship)
-- So we don't have a unique constraint on person_id

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_person_program_data_person ON public.person_program_data(person_id);
CREATE INDEX IF NOT EXISTS idx_person_program_data_type ON public.person_program_data(program_type);
CREATE INDEX IF NOT EXISTS idx_person_program_data_status ON public.person_program_data(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_person_program_data_location ON public.person_program_data(assigned_location_id);
CREATE INDEX IF NOT EXISTS idx_person_program_data_mentor ON public.person_program_data(assigned_mentor_id);
CREATE INDEX IF NOT EXISTS idx_person_program_data_dates ON public.person_program_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_person_program_data_cohort ON public.person_program_data(cohort_identifier);
CREATE INDEX IF NOT EXISTS idx_person_program_data_school ON public.person_program_data(school_of_origin);

-- =====================================================
-- STEP 3: UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_person_program_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_person_program_data ON public.person_program_data;
CREATE TRIGGER trigger_update_person_program_data
  BEFORE UPDATE ON public.person_program_data
  FOR EACH ROW
  EXECUTE FUNCTION update_person_program_data_updated_at();

-- =====================================================
-- STEP 4: ADD PROGRAM HAT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_program_hat(
  p_person_id UUID,
  p_program_type education_program_type,
  p_program_name TEXT DEFAULT NULL,
  p_school_of_origin TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_assigned_location_id UUID DEFAULT NULL,
  p_assigned_mentor_id UUID DEFAULT NULL,
  p_application_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO public.person_program_data (
    person_id,
    program_type,
    enrollment_status,
    program_name,
    school_of_origin,
    start_date,
    end_date,
    assigned_location_id,
    assigned_mentor_id,
    application_data,
    applied_at
  ) VALUES (
    p_person_id,
    p_program_type,
    'applied',
    p_program_name,
    p_school_of_origin,
    p_start_date,
    p_end_date,
    p_assigned_location_id,
    p_assigned_mentor_id,
    p_application_data,
    NOW()
  )
  RETURNING id INTO v_new_id;
  
  -- Update the unified_persons stage if not already student
  UPDATE public.unified_persons
  SET 
    current_stage = 'student',
    stage_entered_at = CASE 
      WHEN current_stage != 'student' THEN NOW() 
      ELSE stage_entered_at 
    END,
    updated_at = NOW()
  WHERE id = p_person_id
    AND current_stage NOT IN ('employee', 'alumni'); -- Don't demote employees
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: IDENTITY RESOLUTION FUNCTION
-- =====================================================
-- Finds or creates a unified_person by email
-- Drop any existing versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_or_create_person(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT 'direct',
  p_source_detail TEXT DEFAULT NULL
)
RETURNS TABLE(person_id UUID, is_new BOOLEAN, existing_stage person_lifecycle_stage) AS $$
DECLARE
  v_existing_person RECORD;
  v_new_id UUID;
BEGIN
  -- Try to find existing person by email (case-insensitive)
  SELECT * INTO v_existing_person
  FROM public.unified_persons
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;
  
  IF FOUND THEN
    -- Return existing person
    person_id := v_existing_person.id;
    is_new := FALSE;
    existing_stage := v_existing_person.current_stage;
    RETURN NEXT;
  ELSE
    -- Create new person
    INSERT INTO public.unified_persons (
      first_name,
      last_name,
      email,
      phone_mobile,
      source_type,
      source_detail,
      current_stage
    ) VALUES (
      TRIM(p_first_name),
      TRIM(p_last_name),
      LOWER(TRIM(p_email)),
      p_phone,
      p_source_type,
      p_source_detail,
      'visitor'
    )
    RETURNING id INTO v_new_id;
    
    person_id := v_new_id;
    is_new := TRUE;
    existing_stage := 'visitor';
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: INVITE STUDENT FUNCTION
-- Creates person + program enrollment + invite link
-- =====================================================
-- Drop any existing versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.invite_student(TEXT, TEXT, TEXT, education_program_type, TEXT, TEXT, DATE, DATE, TEXT, UUID, UUID, BOOLEAN, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.invite_student(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_program_type education_program_type,
  p_program_name TEXT DEFAULT NULL,
  p_school_of_origin TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_assigned_location_id UUID DEFAULT NULL,
  p_assigned_mentor_id UUID DEFAULT NULL,
  p_send_email BOOLEAN DEFAULT TRUE,
  p_expires_in_days INTEGER DEFAULT 30,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  person_id UUID, 
  program_enrollment_id UUID,
  is_new_person BOOLEAN, 
  existing_stage person_lifecycle_stage,
  invite_token TEXT,
  invite_url TEXT
) AS $$
DECLARE
  v_person_result RECORD;
  v_program_id UUID;
  v_token TEXT;
BEGIN
  -- Find or create person
  SELECT * INTO v_person_result
  FROM public.find_or_create_person(
    p_email, p_first_name, p_last_name, p_phone, 'student_invite', p_program_name
  );
  
  -- Add program enrollment
  v_program_id := public.add_program_hat(
    v_person_result.person_id,
    p_program_type,
    p_program_name,
    p_school_of_origin,
    p_start_date,
    p_end_date,
    p_assigned_location_id,
    p_assigned_mentor_id
  );
  
  -- Create intake link for student to complete their profile
  v_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.intake_links (
    token,
    link_type,
    person_id,
    prefill_email,
    prefill_first_name,
    prefill_last_name,
    expires_at,
    created_by,
    metadata
  ) VALUES (
    v_token,
    'student_application',
    v_person_result.person_id,
    p_email,
    p_first_name,
    p_last_name,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_created_by,
    jsonb_build_object(
      'program_type', p_program_type::TEXT,
      'program_name', p_program_name,
      'program_enrollment_id', v_program_id
    )
  );
  
  -- Return results
  person_id := v_person_result.person_id;
  program_enrollment_id := v_program_id;
  is_new_person := v_person_result.is_new;
  existing_stage := v_person_result.existing_stage;
  invite_token := v_token;
  invite_url := '/intake/' || v_token;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: STUDENT PROGRAM VIEW
-- Combines unified_persons with person_program_data
-- =====================================================

CREATE OR REPLACE VIEW public.student_program_view AS
SELECT 
  ppd.id AS enrollment_id,
  up.id AS person_id,
  
  -- Person Info
  up.first_name,
  up.last_name,
  up.preferred_name,
  COALESCE(up.preferred_name, up.first_name) || ' ' || up.last_name AS display_name,
  up.email,
  up.phone_mobile,
  up.avatar_url,
  up.current_stage AS lifecycle_stage,
  
  -- Program Info
  ppd.program_type,
  ppd.enrollment_status,
  ppd.program_name,
  ppd.cohort_identifier,
  ppd.start_date,
  ppd.end_date,
  ppd.expected_graduation_date,
  ppd.actual_completion_date,
  
  -- School Info
  ppd.school_of_origin,
  ppd.school_program,
  ppd.academic_advisor,
  
  -- Assignment
  ppd.assigned_location_id,
  l.name AS location_name,
  ppd.assigned_mentor_id,
  mentor.first_name || ' ' || mentor.last_name AS mentor_name,
  ppd.assigned_coordinator_id,
  coord.first_name || ' ' || coord.last_name AS coordinator_name,
  
  -- Schedule
  ppd.schedule_type,
  ppd.scheduled_hours_per_week,
  
  -- Compensation
  ppd.is_paid,
  ppd.stipend_amount,
  ppd.stipend_frequency,
  
  -- Progress
  ppd.hours_completed,
  ppd.hours_required,
  CASE 
    WHEN ppd.hours_required > 0 
    THEN ROUND((ppd.hours_completed / ppd.hours_required) * 100, 1)
    ELSE 0 
  END AS completion_percentage,
  ppd.overall_performance_rating,
  
  -- Outcomes
  ppd.eligible_for_employment,
  ppd.employment_interest_level,
  ppd.converted_to_employee,
  
  -- Status flags
  CASE 
    WHEN ppd.start_date > CURRENT_DATE THEN 'upcoming'
    WHEN ppd.end_date < CURRENT_DATE THEN 'past'
    WHEN ppd.enrollment_status IN ('enrolled', 'in_progress') THEN 'current'
    ELSE 'other'
  END AS time_status,
  
  -- Metadata
  ppd.created_at,
  ppd.updated_at

FROM public.person_program_data ppd
JOIN public.unified_persons up ON up.id = ppd.person_id
LEFT JOIN public.locations l ON l.id = ppd.assigned_location_id
LEFT JOIN public.employees mentor ON mentor.id = ppd.assigned_mentor_id
LEFT JOIN public.employees coord ON coord.id = ppd.assigned_coordinator_id;

-- =====================================================
-- STEP 8: RLS POLICIES
-- =====================================================

ALTER TABLE public.person_program_data ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admins have full access to program data" ON public.person_program_data;
CREATE POLICY "Admins have full access to program data"
  ON public.person_program_data
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- GDU coordinators can manage
DROP POLICY IF EXISTS "GDU coordinators can manage program data" ON public.person_program_data;
CREATE POLICY "GDU coordinators can manage program data"
  ON public.person_program_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager', 'gdu_coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager', 'gdu_coordinator')
    )
  );

-- Mentors can view assigned students
DROP POLICY IF EXISTS "Mentors can view assigned students" ON public.person_program_data;
CREATE POLICY "Mentors can view assigned students"
  ON public.person_program_data
  FOR SELECT
  USING (
    assigned_mentor_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON p.id = e.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_program_hat TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_person TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_student TO authenticated;

-- Grant view access
GRANT SELECT ON public.student_program_view TO authenticated;

-- =====================================================
-- STEP 9: MIGRATE DATA FROM EDUCATION_VISITORS
-- (Only interns/externs/students, not CE attendees)
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_education_visitors_to_program_data()
RETURNS TABLE(migrated_count INTEGER, skipped_count INTEGER) AS $$
DECLARE
  v_migrated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_record RECORD;
  v_person_id UUID;
  v_program_type education_program_type;
BEGIN
  FOR v_record IN 
    SELECT * FROM public.education_visitors 
    WHERE visitor_type IN ('intern', 'extern', 'student', 'shadow')
  LOOP
    -- Map visitor_type to program_type
    v_program_type := CASE v_record.visitor_type
      WHEN 'intern' THEN 'internship'::education_program_type
      WHEN 'extern' THEN 'externship'::education_program_type
      WHEN 'student' THEN 'paid_cohort'::education_program_type
      WHEN 'shadow' THEN 'shadow'::education_program_type
    END;
    
    -- Find or create unified person
    SELECT (find_or_create_person).person_id INTO v_person_id
    FROM find_or_create_person(
      COALESCE(v_record.email, v_record.first_name || '.' || v_record.last_name || '@unknown.edu'),
      v_record.first_name,
      v_record.last_name,
      v_record.phone,
      'education_visitor_migration',
      'Migrated from education_visitors'
    );
    
    -- Check if already migrated
    IF NOT EXISTS (
      SELECT 1 FROM public.person_program_data 
      WHERE legacy_visitor_id = v_record.id
    ) THEN
      -- Insert program data
      INSERT INTO public.person_program_data (
        person_id,
        program_type,
        enrollment_status,
        program_name,
        school_of_origin,
        start_date,
        end_date,
        program_notes,
        legacy_visitor_id,
        created_at
      ) VALUES (
        v_person_id,
        v_program_type,
        CASE 
          WHEN v_record.visit_end_date < CURRENT_DATE THEN 'completed'
          WHEN v_record.visit_start_date <= CURRENT_DATE THEN 'in_progress'
          ELSE 'enrolled'
        END::program_enrollment_status,
        v_record.program_name,
        v_record.school_of_origin,
        v_record.visit_start_date,
        v_record.visit_end_date,
        v_record.notes,
        v_record.id,
        v_record.created_at
      );
      
      v_migrated := v_migrated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  migrated_count := v_migrated;
  skipped_count := v_skipped;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.person_program_data IS 'Education program enrollment extension for unified_persons. Implements the "Education Hat" pattern where a person can enroll in multiple programs over time without duplicating identity data.';
COMMENT ON FUNCTION public.add_program_hat IS 'Adds an education program enrollment to a unified person, updating their lifecycle stage if needed.';
COMMENT ON FUNCTION public.find_or_create_person IS 'Identity resolution function that finds existing person by email or creates new one.';
COMMENT ON FUNCTION public.invite_student IS 'Full workflow to invite a student: creates person, adds program enrollment, and generates intake link.';
