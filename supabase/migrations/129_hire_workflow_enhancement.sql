-- =====================================================
-- Migration 129: Hire Workflow Enhancement
-- =====================================================
-- Description: Enhances the hiring workflow with:
--   1. HR-only notes fields on employee_notes
--   2. Source tracking from student/candidate
--   3. Pending hire notification triggers
--   4. User account creation function
-- =====================================================

-- =====================================================
-- STEP 1: Add HR-only visibility to employee_notes
-- =====================================================
ALTER TABLE public.employee_notes 
ADD COLUMN IF NOT EXISTS hr_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.employee_notes.hr_only IS 
'When true, note is only visible to admin/HR roles';

-- Add source tracking to candidates
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS source_person_id UUID REFERENCES public.unified_persons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_enrollment_id UUID,
ADD COLUMN IF NOT EXISTS conversion_source TEXT CHECK (conversion_source IN ('direct', 'student_program', 'referral', 'external'));

COMMENT ON COLUMN public.candidates.source_person_id IS 
'If converted from a student, links to their unified_persons record';
COMMENT ON COLUMN public.candidates.source_enrollment_id IS 
'If converted from student, links to their person_program_data record';

-- =====================================================
-- STEP 2: Add pending_user_creation tracking to employees
-- =====================================================
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS needs_user_account BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending' 
  CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- =====================================================
-- STEP 3: Enhanced promote_candidate_to_employee function
-- Now handles HR-only notes and unified persons linking
-- =====================================================

CREATE OR REPLACE FUNCTION public.promote_candidate_to_employee_v2(
  p_candidate_id UUID,
  p_employment_type TEXT,
  p_job_title_id UUID,
  p_start_date DATE,
  p_starting_wage NUMERIC,
  p_pay_type TEXT DEFAULT 'hourly',
  p_department_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL
)
RETURNS TABLE(
  employee_id UUID,
  profile_id UUID,
  employee_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_employee_id UUID;
  v_new_profile_id UUID;
  v_candidate RECORD;
  v_employee_number TEXT;
BEGIN
  -- 1. Fetch the candidate record
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found: %', p_candidate_id;
  END IF;
  
  IF v_candidate.status = 'hired' THEN
    RAISE EXCEPTION 'Candidate has already been hired';
  END IF;
  
  -- 2. Generate employee number (EMP-YYYYMMDD-XXXX)
  v_employee_number := 'EMP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                       lpad(floor(random() * 10000)::text, 4, '0');
  
  -- 3. Create a profile for the new employee (no auth user yet)
  INSERT INTO profiles (
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    role,
    is_active
  ) VALUES (
    v_candidate.email,
    v_candidate.first_name,
    v_candidate.last_name,
    COALESCE(v_candidate.phone_mobile, v_candidate.phone),
    v_candidate.avatar_url,
    'user',
    true
  )
  RETURNING id INTO v_new_profile_id;
  
  -- 4. Create the employee record
  INSERT INTO employees (
    profile_id,
    employee_number,
    first_name,
    last_name,
    preferred_name,
    email_work,
    email_personal,
    phone_work,
    phone_mobile,
    department_id,
    position_id,
    manager_employee_id,
    location_id,
    employment_type,
    employment_status,
    hire_date,
    date_of_birth,
    notes_internal,
    needs_user_account,
    onboarding_status
  ) VALUES (
    v_new_profile_id,
    v_employee_number,
    v_candidate.first_name,
    v_candidate.last_name,
    v_candidate.preferred_name,
    v_candidate.email,
    v_candidate.email_personal,
    v_candidate.phone_work,
    COALESCE(v_candidate.phone_mobile, v_candidate.phone),
    COALESCE(p_department_id, v_candidate.department_id),
    p_job_title_id,
    p_manager_id,
    COALESCE(p_location_id, v_candidate.location_id),
    p_employment_type,
    'active',
    p_start_date,
    v_candidate.date_of_birth,
    NULL,  -- Don't copy raw notes - they go to employee_notes with HR flag
    true,  -- needs_user_account
    'pending'
  )
  RETURNING id INTO v_new_employee_id;
  
  -- 5. Migrate candidate_skills → employee_skills
  INSERT INTO employee_skills (
    employee_id,
    skill_id,
    rating,
    is_goal,
    notes,
    last_assessed_at,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cs.skill_id,
    cs.rating,
    false,
    cs.notes,
    cs.rated_at,
    cs.created_at
  FROM candidate_skills cs
  WHERE cs.candidate_id = p_candidate_id;
  
  -- 6. Migrate candidate_documents → employee_documents
  INSERT INTO employee_documents (
    employee_id,
    uploader_id,
    file_name,
    file_url,
    file_type,
    file_size,
    description,
    category,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cd.uploader_id,
    cd.file_name,
    cd.file_url,
    cd.file_type,
    cd.file_size,
    cd.description,
    CASE cd.category
      WHEN 'resume' THEN 'general'
      WHEN 'cover_letter' THEN 'general'
      WHEN 'certification' THEN 'certification'
      WHEN 'license' THEN 'license'
      WHEN 'background_check' THEN 'other'
      ELSE COALESCE(cd.category, 'general')
    END,
    cd.created_at
  FROM candidate_documents cd
  WHERE cd.candidate_id = p_candidate_id;
  
  -- 7. Migrate candidate_notes → employee_notes (marked as HR-only)
  INSERT INTO employee_notes (
    employee_id,
    author_id,
    note,
    note_type,
    is_pinned,
    hr_only,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cn.author_id,
    '[Hiring Note] ' || cn.note,
    'hr',
    false,
    true,  -- HR-only for hiring notes
    cn.created_at
  FROM candidate_notes cn
  WHERE cn.candidate_id = p_candidate_id;
  
  -- 8. Add system note about the hire
  INSERT INTO employee_notes (
    employee_id,
    note,
    note_type,
    hr_only,
    created_at
  ) VALUES (
    v_new_employee_id,
    'Employee hired from candidate pool. Start date: ' || p_start_date::text || 
    CASE WHEN v_candidate.source_enrollment_id IS NOT NULL 
      THEN '. Previously a student in ' || COALESCE(
        (SELECT program_name FROM person_program_data WHERE id = v_candidate.source_enrollment_id),
        'education program'
      )
      ELSE ''
    END,
    'system',
    true,
    NOW()
  );
  
  -- 9. Create license record if candidate had license info
  IF v_candidate.license_number IS NOT NULL THEN
    INSERT INTO employee_licenses (
      employee_id,
      license_type,
      license_number,
      state,
      expiration_date,
      status
    ) VALUES (
      v_new_employee_id,
      COALESCE(v_candidate.license_type, 'RVT'),
      v_candidate.license_number,
      v_candidate.license_state,
      v_candidate.license_expiration,
      CASE 
        WHEN v_candidate.license_expiration < CURRENT_DATE THEN 'expired'
        ELSE 'active'
      END
    );
  END IF;
  
  -- 10. Create pay settings for the employee
  INSERT INTO employee_pay_settings (
    employee_id,
    pay_type,
    hourly_rate,
    annual_salary,
    effective_date
  ) VALUES (
    v_new_employee_id,
    p_pay_type,
    CASE WHEN p_pay_type = 'hourly' THEN p_starting_wage ELSE NULL END,
    CASE WHEN p_pay_type = 'salary' THEN p_starting_wage ELSE NULL END,
    p_start_date
  );
  
  -- 11. Update candidate status to 'hired'
  UPDATE candidates 
  SET 
    status = 'hired',
    updated_at = NOW()
  WHERE id = p_candidate_id;
  
  -- 12. Update unified_persons if linked
  IF v_candidate.source_person_id IS NOT NULL THEN
    UPDATE unified_persons
    SET 
      current_stage = 'employee',
      stage_entered_at = NOW(),
      updated_at = NOW()
    WHERE id = v_candidate.source_person_id;
    
    -- Also update the program data if there was an enrollment
    IF v_candidate.source_enrollment_id IS NOT NULL THEN
      UPDATE person_program_data
      SET 
        converted_to_employee = true,
        employee_conversion_date = p_start_date,
        converted_employee_id = v_new_employee_id,
        updated_at = NOW()
      WHERE id = v_candidate.source_enrollment_id;
    END IF;
  END IF;
  
  -- Return the results
  employee_id := v_new_employee_id;
  profile_id := v_new_profile_id;
  employee_number := v_employee_number;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_candidate_to_employee_v2 TO authenticated;

-- =====================================================
-- STEP 4: Create user account function
-- Creates a Supabase auth user for an employee
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_employee_user_account(
  p_employee_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  temp_password TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_profile RECORD;
  v_temp_password TEXT;
  v_new_user_id UUID;
BEGIN
  -- Get the employee
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    success := false;
    message := 'Employee not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Get the profile
  SELECT * INTO v_profile FROM profiles WHERE id = v_employee.profile_id;
  IF NOT FOUND THEN
    success := false;
    message := 'Employee profile not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if user already exists
  IF v_profile.auth_user_id IS NOT NULL THEN
    success := false;
    message := 'User account already exists';
    user_id := v_profile.auth_user_id;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Generate temp password if not provided
  v_temp_password := COALESCE(p_password, 
    'GD' || upper(substring(md5(random()::text) from 1 for 8)) || '!'
  );
  
  -- The actual user creation needs to be done via the Supabase Admin API
  -- This function sets up the data and returns what's needed
  success := true;
  temp_password := v_temp_password;
  message := 'Ready to create user. Use Admin API with email: ' || v_profile.email;
  
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_employee_user_account TO authenticated;

-- =====================================================
-- STEP 5: Add notification trigger for new hires
-- =====================================================

-- Insert hire notification trigger if it doesn't exist
INSERT INTO notification_triggers (event_type, description, default_channel, is_active)
VALUES (
  'candidate_hired',
  'Notification when a candidate is hired and needs user account setup',
  '#hr-notifications',
  true
)
ON CONFLICT (event_type) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true;

-- =====================================================
-- STEP 6: View for pending user account creation
-- =====================================================

CREATE OR REPLACE VIEW public.pending_user_accounts AS
SELECT 
  e.id AS employee_id,
  e.employee_number,
  e.first_name,
  e.last_name,
  COALESCE(e.preferred_name, e.first_name) || ' ' || e.last_name AS display_name,
  e.email_work,
  e.email_personal,
  e.phone_mobile,
  e.hire_date,
  e.employment_status,
  e.onboarding_status,
  e.needs_user_account,
  e.created_at AS hired_at,
  p.id AS profile_id,
  p.auth_user_id,
  p.role AS profile_role,
  pos.title AS position_title,
  d.name AS department_name,
  l.name AS location_name
FROM employees e
JOIN profiles p ON p.id = e.profile_id
LEFT JOIN job_positions pos ON pos.id = e.position_id
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN locations l ON l.id = e.location_id
WHERE e.needs_user_account = true
  AND p.auth_user_id IS NULL
  AND e.employment_status = 'active'
ORDER BY e.hire_date DESC, e.created_at DESC;

GRANT SELECT ON public.pending_user_accounts TO authenticated;

-- =====================================================
-- STEP 7: Convert student to candidate function
-- Comprehensive data transfer
-- =====================================================

CREATE OR REPLACE FUNCTION public.convert_student_to_candidate(
  p_enrollment_id UUID,
  p_target_position_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_person RECORD;
  v_new_candidate_id UUID;
  v_combined_notes TEXT;
BEGIN
  -- Get the enrollment
  SELECT * INTO v_enrollment 
  FROM person_program_data 
  WHERE id = p_enrollment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found: %', p_enrollment_id;
  END IF;
  
  -- Get the unified person
  SELECT * INTO v_person 
  FROM unified_persons 
  WHERE id = v_enrollment.person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found for enrollment';
  END IF;
  
  -- Build combined notes
  v_combined_notes := 'Converted from ' || 
    CASE v_enrollment.program_type
      WHEN 'internship' THEN 'Internship'
      WHEN 'externship' THEN 'Externship'
      WHEN 'paid_cohort' THEN 'Paid Cohort'
      WHEN 'intensive' THEN 'Student Intensive'
      WHEN 'shadow' THEN 'Shadow Program'
      ELSE v_enrollment.program_type::text
    END || ' program';
  
  IF v_enrollment.program_name IS NOT NULL THEN
    v_combined_notes := v_combined_notes || ' (' || v_enrollment.program_name || ')';
  END IF;
  
  IF v_enrollment.school_of_origin IS NOT NULL THEN
    v_combined_notes := v_combined_notes || '. School: ' || v_enrollment.school_of_origin;
  END IF;
  
  IF v_enrollment.hours_completed IS NOT NULL AND v_enrollment.hours_required IS NOT NULL THEN
    v_combined_notes := v_combined_notes || 
      '. Completed ' || v_enrollment.hours_completed || '/' || v_enrollment.hours_required || ' hours';
  END IF;
  
  IF v_enrollment.overall_performance_rating IS NOT NULL THEN
    v_combined_notes := v_combined_notes || 
      '. Performance: ' || replace(v_enrollment.overall_performance_rating, '_', ' ');
  END IF;
  
  IF v_enrollment.program_notes IS NOT NULL THEN
    v_combined_notes := v_combined_notes || E'\n\n--- Program Notes ---\n' || v_enrollment.program_notes;
  END IF;
  
  IF p_notes IS NOT NULL THEN
    v_combined_notes := v_combined_notes || E'\n\n--- Additional Notes ---\n' || p_notes;
  END IF;
  
  -- Create the candidate
  INSERT INTO candidates (
    first_name,
    last_name,
    preferred_name,
    email,
    email_personal,
    phone,
    phone_mobile,
    avatar_url,
    source,
    referral_source,
    status,
    target_position_id,
    notes,
    source_person_id,
    source_enrollment_id,
    conversion_source,
    applied_at,
    created_at
  ) VALUES (
    v_person.first_name,
    v_person.last_name,
    v_person.preferred_name,
    v_person.email,
    v_person.email,
    v_person.phone_mobile,
    v_person.phone_mobile,
    v_person.avatar_url,
    'internal_program',
    'Converted from ' || v_enrollment.program_type::text,
    'new',
    p_target_position_id,
    v_combined_notes,
    v_person.id,
    p_enrollment_id,
    'student_program',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_candidate_id;
  
  -- Update the enrollment status
  UPDATE person_program_data
  SET 
    enrollment_status = 'completed',
    actual_completion_date = CURRENT_DATE,
    program_notes = COALESCE(program_notes, '') || E'\n\nConverted to recruiting candidate on ' || 
      to_char(NOW(), 'YYYY-MM-DD'),
    updated_at = NOW()
  WHERE id = p_enrollment_id;
  
  -- Update unified person stage
  UPDATE unified_persons
  SET 
    current_stage = 'applicant',
    stage_entered_at = NOW(),
    updated_at = NOW()
  WHERE id = v_person.id;
  
  -- Create initial candidate note
  INSERT INTO candidate_notes (
    candidate_id,
    note,
    note_type,
    created_at
  ) VALUES (
    v_new_candidate_id,
    'Candidate converted from education program. ' ||
    CASE WHEN v_enrollment.overall_performance_rating IS NOT NULL
      THEN 'Program performance rating: ' || replace(v_enrollment.overall_performance_rating, '_', ' ') || '. '
      ELSE ''
    END ||
    CASE WHEN v_enrollment.employment_interest_level IS NOT NULL
      THEN 'Employment interest: ' || replace(v_enrollment.employment_interest_level, '_', ' ') || '.'
      ELSE ''
    END,
    'system',
    NOW()
  );
  
  RETURN v_new_candidate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_student_to_candidate TO authenticated;

-- =====================================================
-- STEP 8: Add target_position_id to candidates if missing
-- =====================================================
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS target_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;
