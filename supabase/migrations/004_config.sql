-- =====================================================
-- Employee GM - Green Dog Dental
-- CONFIGURATION - Admin setup, profile linking
-- Last updated: December 2024
-- =====================================================

-- =====================================================
-- SET MARC AS ADMIN
-- =====================================================
UPDATE public.profiles 
SET role = 'admin' 
WHERE LOWER(email) = 'marc.h.mercury@gmail.com';

-- =====================================================
-- LINK MARC'S PROFILE TO EMPLOYEE RECORD
-- =====================================================
DO $$
DECLARE
  marc_profile_id UUID;
  marc_employee_id UUID;
BEGIN
  -- Find Marc's profile
  SELECT id INTO marc_profile_id
  FROM public.profiles
  WHERE LOWER(email) = 'marc.h.mercury@gmail.com'
  LIMIT 1;
  
  -- Find Marc's employee record
  SELECT id INTO marc_employee_id
  FROM public.employees
  WHERE LOWER(first_name) = 'marc' AND LOWER(last_name) = 'mercury'
  LIMIT 1;
  
  -- Link them if both exist
  IF marc_profile_id IS NOT NULL AND marc_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET profile_id = marc_profile_id
    WHERE id = marc_employee_id;
    
    RAISE NOTICE 'Linked Marc Mercury profile to employee record';
  ELSE
    RAISE NOTICE 'Could not find Marc Mercury profile or employee record';
  END IF;
END $$;

-- =====================================================
-- SEED ALL EMPLOYEE SKILLS (Level 0)
-- Ensures every employee has visibility of all skills
-- =====================================================
INSERT INTO public.employee_skills (employee_id, skill_id, level, is_goal)
SELECT e.id, s.id, 0, false
FROM public.employees e
CROSS JOIN public.skill_library s
ON CONFLICT (employee_id, skill_id) DO NOTHING;

-- =====================================================
-- DEFAULT APP SETTINGS
-- =====================================================
INSERT INTO public.app_settings (key, value) VALUES
('company_name', 'Green Dog Dental'),
('timezone', 'America/Los_Angeles'),
('date_format', 'MM/DD/YYYY'),
('time_format', '12h'),
('week_start', '0'),
('skill_max_level', '5'),
('mentor_min_level', '5'),
('mentee_max_level', '1'),
('points_per_skill_level', '50'),
('points_per_training', '100'),
('points_per_certification', '200')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =====================================================
-- DEFAULT FEATURE FLAGS
-- =====================================================
INSERT INTO public.feature_flags (feature_key, is_enabled) VALUES
('gamification', true),
('mentorship_matching', true),
('skill_self_rating', true),
('training_quizzes', true),
('schedule_builder', true),
('time_off_requests', true),
('performance_reviews', false),
('payroll_integration', false),
('marketing_module', true),
('recruiting_module', true),
('public_lead_forms', true)
ON CONFLICT (feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth.users';
COMMENT ON TABLE public.employees IS 'Employee records with HR data';
COMMENT ON TABLE public.skill_library IS 'Master list of all skills that can be rated';
COMMENT ON TABLE public.employee_skills IS 'Junction table linking employees to their skill ratings';
COMMENT ON TABLE public.mentorships IS 'Mentor-mentee relationships for skill development';
COMMENT ON TABLE public.marketing_campaigns IS 'Marketing campaign tracking with ROI metrics';
COMMENT ON TABLE public.marketing_leads IS 'Lead capture from marketing events and campaigns';
COMMENT ON TABLE public.referral_partners IS 'Partner practices that refer patients';
COMMENT ON TABLE public.candidates IS 'Job candidates for the recruiting pipeline';
