-- Fix for find_or_create_person function ambiguity
-- Run this if migration 121 failed due to function name conflict

-- Drop ALL existing versions of these functions
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_person(TEXT, TEXT, TEXT, TEXT, TEXT);

DROP FUNCTION IF EXISTS public.invite_student(TEXT, TEXT, TEXT, education_program_type, TEXT, TEXT, DATE, DATE, TEXT, UUID, UUID, BOOLEAN, INTEGER, UUID);

-- Now recreate find_or_create_person
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

-- Now recreate invite_student
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_or_create_person TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_student TO authenticated;
