-- =====================================================
-- Migration: 185_fix_invite_student_function.sql
-- Purpose: Fix the invite_student function to use correct column names
--          for the intake_links table
-- 
-- Issue: The original function referenced columns that don't exist:
--   - person_id (should be resulting_person_id)
--   - metadata (doesn't exist in intake_links)
-- =====================================================

-- Drop and recreate the invite_student function with correct column names
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
  
  -- Fixed: Use correct column names for intake_links table
  -- - Use 'resulting_person_id' instead of 'person_id'
  -- - Remove 'metadata' column which doesn't exist
  -- - Use 'student_enrollment' as link_type (matching the CHECK constraint)
  INSERT INTO public.intake_links (
    token,
    link_type,
    resulting_person_id,
    prefill_email,
    prefill_first_name,
    prefill_last_name,
    expires_at,
    created_by,
    internal_notes
  ) VALUES (
    v_token,
    'student_enrollment',
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
    )::TEXT
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.invite_student TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.invite_student IS 'Full workflow to invite a student: creates person, adds program enrollment, and generates intake link. Fixed in migration 185 to use correct intake_links column names.';
