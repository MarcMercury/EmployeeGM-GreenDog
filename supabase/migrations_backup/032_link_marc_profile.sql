-- =====================================================
-- MIGRATION: 032_link_marc_profile.sql
-- Description: Link Marc Mercury's profile to employee record
-- =====================================================

-- Link Marc's profile to his employee record
-- Profile email: Marc.H.Mercury@gmail.com
-- Employee: EMP049 (Marc Mercury)

UPDATE public.employees 
SET profile_id = (
  SELECT id FROM public.profiles 
  WHERE LOWER(email) = LOWER('Marc.H.Mercury@gmail.com')
  LIMIT 1
)
WHERE employee_number = 'EMP049'
  AND profile_id IS NULL;

-- Verify the link was created
DO $$
DECLARE
  v_profile_id UUID;
  v_employee_id UUID;
BEGIN
  SELECT profile_id, id INTO v_profile_id, v_employee_id
  FROM public.employees 
  WHERE employee_number = 'EMP049';
  
  IF v_profile_id IS NOT NULL THEN
    RAISE NOTICE 'SUCCESS: Marc Mercury (EMP049) linked to profile %', v_profile_id;
  ELSE
    RAISE WARNING 'FAILED: Marc Mercury profile_id is still NULL. Profile may not exist yet.';
  END IF;
END $$;
