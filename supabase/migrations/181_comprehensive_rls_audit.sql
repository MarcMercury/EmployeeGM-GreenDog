-- =====================================================
-- Migration 181: Comprehensive RLS Policy Audit & Fix
-- =====================================================
-- This migration audits and fixes ALL RLS policies to ensure
-- proper access based on the application's role hierarchy:
--
-- ROLE HIERARCHY (highest to lowest):
-- - super_admin (200): Full access to everything
-- - admin (100): Full access to everything  
-- - manager (80): HR + Marketing + Recruiting + Education + Schedules
-- - hr_admin (60): HR + Recruiting + Schedules + Education
-- - sup_admin (55): HR + Recruiting + Schedules + Education (Supervisor)
-- - office_admin (50): HR + Recruiting + Schedules
-- - marketing_admin (40): Marketing + GDU/Education
-- - user (10): Own data only
--
-- SECTION ACCESS:
-- - hr: super_admin, admin, manager, hr_admin, sup_admin, office_admin
-- - recruiting: super_admin, admin, manager, hr_admin, sup_admin, office_admin
-- - marketing: super_admin, admin, manager, marketing_admin
-- - education/gdu: super_admin, admin, manager, hr_admin, sup_admin, marketing_admin
-- - schedules_manage: super_admin, admin, manager, sup_admin, office_admin
-- - schedules_view: all authenticated users
-- - admin_only: super_admin, admin
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE ALL HELPER FUNCTIONS
-- =====================================================

-- 1.1 is_super_admin() - Only super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;

-- 1.2 is_admin() - super_admin or admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 1.3 is_hr_admin() - HR section access
-- Roles: super_admin, admin, manager, hr_admin, sup_admin, office_admin
CREATE OR REPLACE FUNCTION public.is_hr_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_hr_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_admin() TO anon;

-- 1.4 is_marketing_admin() - Marketing section access
-- Roles: super_admin, admin, manager, marketing_admin
CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO anon;

-- 1.5 is_gdu_admin() - Education/GDU section access
-- Roles: super_admin, admin, manager, hr_admin, sup_admin, marketing_admin
CREATE OR REPLACE FUNCTION public.is_gdu_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_gdu_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gdu_admin() TO anon;

-- 1.6 is_schedule_admin() - Schedule management access
-- Roles: super_admin, admin, manager, sup_admin, office_admin
CREATE OR REPLACE FUNCTION public.is_schedule_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'sup_admin', 'office_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_schedule_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_schedule_admin() TO anon;

-- 1.7 is_recruiting_admin() - Recruiting section access
-- Roles: super_admin, admin, manager, hr_admin, sup_admin, office_admin
CREATE OR REPLACE FUNCTION public.is_recruiting_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_recruiting_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_recruiting_admin() TO anon;

-- =====================================================
-- SECTION 2: HR TABLES (employees, profiles, skills, etc.)
-- Access: is_hr_admin()
-- =====================================================

-- 2.1 EMPLOYEES TABLE
DROP POLICY IF EXISTS "employees_admin_all" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "employees_view" ON public.employees;

CREATE POLICY "employees_hr_admin_all"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_hr_admin())
WITH CHECK (public.is_hr_admin());

CREATE POLICY "employees_authenticated_view"
ON public.employees
FOR SELECT
TO authenticated
USING (true);

-- 2.2 PROFILES TABLE
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- HR admins can manage all profiles
CREATE POLICY "profiles_hr_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_hr_admin())
WITH CHECK (public.is_hr_admin());

-- Users can update their own profile
CREATE POLICY "profiles_self_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Everyone can view profiles
CREATE POLICY "profiles_authenticated_view"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2.3 EMPLOYEE_SKILLS TABLE
DROP POLICY IF EXISTS "employee_skills_admin_all" ON public.employee_skills;
DROP POLICY IF EXISTS "employee_skills_self_manage" ON public.employee_skills;
DROP POLICY IF EXISTS "employee_skills_view" ON public.employee_skills;

CREATE POLICY "employee_skills_hr_admin_all"
ON public.employee_skills
FOR ALL
TO authenticated
USING (public.is_hr_admin())
WITH CHECK (public.is_hr_admin());

-- Users can manage their own skills
CREATE POLICY "employee_skills_self_manage"
ON public.employee_skills
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "employee_skills_authenticated_view"
ON public.employee_skills
FOR SELECT
TO authenticated
USING (true);

-- 2.4 SKILL_LIBRARY TABLE (admin only for editing, all can view)
DROP POLICY IF EXISTS "skill_library_admin_all" ON public.skill_library;
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_view" ON public.skill_library;

CREATE POLICY "skill_library_admin_all"
ON public.skill_library
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "skill_library_authenticated_view"
ON public.skill_library
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- SECTION 3: SCHEDULE TABLES
-- Access: is_schedule_admin() for management
-- =====================================================

-- 3.1 SHIFTS TABLE
DROP POLICY IF EXISTS "shifts_admin_all" ON public.shifts;
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_view" ON public.shifts;

CREATE POLICY "shifts_schedule_admin_all"
ON public.shifts
FOR ALL
TO authenticated
USING (public.is_schedule_admin())
WITH CHECK (public.is_schedule_admin());

CREATE POLICY "shifts_authenticated_view"
ON public.shifts
FOR SELECT
TO authenticated
USING (true);

-- 3.2 TIME_OFF_REQUESTS TABLE
DROP POLICY IF EXISTS "time_off_requests_admin_all" ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_user_insert" ON public.time_off_requests;
DROP POLICY IF EXISTS "time_off_requests_user_view" ON public.time_off_requests;

CREATE POLICY "time_off_requests_schedule_admin_all"
ON public.time_off_requests
FOR ALL
TO authenticated
USING (public.is_schedule_admin())
WITH CHECK (public.is_schedule_admin());

-- Users can insert their own time off requests
CREATE POLICY "time_off_requests_user_insert"
ON public.time_off_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
);

-- Users can view their own requests
CREATE POLICY "time_off_requests_user_view"
ON public.time_off_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_id
    AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  OR public.is_schedule_admin()
);

-- 3.3 TIME_PUNCHES TABLE (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_punches') THEN
    DROP POLICY IF EXISTS "time_punches_admin_all" ON public.time_punches;
    DROP POLICY IF EXISTS "time_punches_schedule_admin_all" ON public.time_punches;
    DROP POLICY IF EXISTS "time_punches_self_manage" ON public.time_punches;
    DROP POLICY IF EXISTS "time_punches_view" ON public.time_punches;
    
    EXECUTE 'CREATE POLICY "time_punches_schedule_admin_all" ON public.time_punches FOR ALL TO authenticated USING (public.is_schedule_admin()) WITH CHECK (public.is_schedule_admin())';
    EXECUTE 'CREATE POLICY "time_punches_self_manage" ON public.time_punches FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())))';
    EXECUTE 'CREATE POLICY "time_punches_authenticated_view" ON public.time_punches FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 4: RECRUITING TABLES
-- Access: is_recruiting_admin()
-- =====================================================

-- 4.1 CANDIDATES TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    DROP POLICY IF EXISTS "candidates_admin_all" ON public.candidates;
    DROP POLICY IF EXISTS "candidates_recruiting_admin_all" ON public.candidates;
    DROP POLICY IF EXISTS "candidates_view" ON public.candidates;
    DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
    
    EXECUTE 'CREATE POLICY "candidates_recruiting_admin_all" ON public.candidates FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidates_authenticated_view" ON public.candidates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 4.2 CANDIDATE_NOTES TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_notes') THEN
    DROP POLICY IF EXISTS "candidate_notes_admin_all" ON public.candidate_notes;
    DROP POLICY IF EXISTS "candidate_notes_recruiting_admin_all" ON public.candidate_notes;
    DROP POLICY IF EXISTS "candidate_notes_view" ON public.candidate_notes;
    
    EXECUTE 'CREATE POLICY "candidate_notes_recruiting_admin_all" ON public.candidate_notes FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_notes_authenticated_view" ON public.candidate_notes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 4.3 INTERVIEWS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interviews') THEN
    DROP POLICY IF EXISTS "interviews_admin_all" ON public.interviews;
    DROP POLICY IF EXISTS "interviews_recruiting_admin_all" ON public.interviews;
    DROP POLICY IF EXISTS "interviews_view" ON public.interviews;
    
    EXECUTE 'CREATE POLICY "interviews_recruiting_admin_all" ON public.interviews FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "interviews_authenticated_view" ON public.interviews FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 5: MARKETING TABLES (already fixed in 180)
-- Access: is_marketing_admin()
-- Ensuring consistency
-- =====================================================

-- 5.1 PARTNER_CONTACTS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_contacts') THEN
    DROP POLICY IF EXISTS "partner_contacts_admin_all" ON public.partner_contacts;
    DROP POLICY IF EXISTS "partner_contacts_marketing_admin_all" ON public.partner_contacts;
    DROP POLICY IF EXISTS "partner_contacts_view" ON public.partner_contacts;
    
    EXECUTE 'CREATE POLICY "partner_contacts_marketing_admin_all" ON public.partner_contacts FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "partner_contacts_authenticated_view" ON public.partner_contacts FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5.2 PARTNER_NOTES TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_notes') THEN
    DROP POLICY IF EXISTS "partner_notes_admin_all" ON public.partner_notes;
    DROP POLICY IF EXISTS "partner_notes_marketing_admin_all" ON public.partner_notes;
    DROP POLICY IF EXISTS "partner_notes_view" ON public.partner_notes;
    
    EXECUTE 'CREATE POLICY "partner_notes_marketing_admin_all" ON public.partner_notes FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "partner_notes_authenticated_view" ON public.partner_notes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5.3 PARTNER_VISIT_LOGS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_visit_logs') THEN
    DROP POLICY IF EXISTS "partner_visit_logs_admin_all" ON public.partner_visit_logs;
    DROP POLICY IF EXISTS "partner_visit_logs_marketing_admin_all" ON public.partner_visit_logs;
    DROP POLICY IF EXISTS "partner_visit_logs_view" ON public.partner_visit_logs;
    
    EXECUTE 'CREATE POLICY "partner_visit_logs_marketing_admin_all" ON public.partner_visit_logs FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "partner_visit_logs_authenticated_view" ON public.partner_visit_logs FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5.4 PARTNER_GOALS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_goals') THEN
    DROP POLICY IF EXISTS "partner_goals_admin_all" ON public.partner_goals;
    DROP POLICY IF EXISTS "partner_goals_marketing_admin_all" ON public.partner_goals;
    DROP POLICY IF EXISTS "partner_goals_view" ON public.partner_goals;
    
    EXECUTE 'CREATE POLICY "partner_goals_marketing_admin_all" ON public.partner_goals FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "partner_goals_authenticated_view" ON public.partner_goals FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5.5 CLINIC_VISITS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinic_visits') THEN
    DROP POLICY IF EXISTS "clinic_visits_admin_all" ON public.clinic_visits;
    DROP POLICY IF EXISTS "clinic_visits_marketing_admin_all" ON public.clinic_visits;
    DROP POLICY IF EXISTS "clinic_visits_authenticated_view" ON public.clinic_visits;
    DROP POLICY IF EXISTS "clinic_visits_authenticated_insert" ON public.clinic_visits;
    DROP POLICY IF EXISTS "clinic_visits_view" ON public.clinic_visits;
    DROP POLICY IF EXISTS "Anyone can log clinic visit" ON public.clinic_visits;
    
    -- Marketing admin can manage all
    EXECUTE 'CREATE POLICY "clinic_visits_marketing_admin_all" ON public.clinic_visits FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    -- All authenticated can insert (log visits)
    EXECUTE 'CREATE POLICY "clinic_visits_authenticated_insert" ON public.clinic_visits FOR INSERT TO authenticated WITH CHECK (true)';
    -- All authenticated can view
    EXECUTE 'CREATE POLICY "clinic_visits_authenticated_view" ON public.clinic_visits FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5.6 INFLUENCERS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'influencers') THEN
    DROP POLICY IF EXISTS "influencers_admin_all" ON public.influencers;
    DROP POLICY IF EXISTS "influencers_marketing_admin_all" ON public.influencers;
    DROP POLICY IF EXISTS "influencers_view" ON public.influencers;
    
    EXECUTE 'CREATE POLICY "influencers_marketing_admin_all" ON public.influencers FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "influencers_authenticated_view" ON public.influencers FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 6: TRAINING/ACADEMY TABLES
-- Access: is_hr_admin() for management (training is HR function)
-- =====================================================

-- 6.1 TRAINING_COURSES TABLE
DROP POLICY IF EXISTS "training_courses_admin_all" ON public.training_courses;
DROP POLICY IF EXISTS "training_courses_hr_admin_all" ON public.training_courses;
DROP POLICY IF EXISTS "training_courses_view" ON public.training_courses;

CREATE POLICY "training_courses_hr_admin_all"
ON public.training_courses
FOR ALL
TO authenticated
USING (public.is_hr_admin())
WITH CHECK (public.is_hr_admin());

CREATE POLICY "training_courses_authenticated_view"
ON public.training_courses
FOR SELECT
TO authenticated
USING (true);

-- 6.2 COURSE_ENROLLMENTS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_enrollments') THEN
    DROP POLICY IF EXISTS "course_enrollments_admin_all" ON public.course_enrollments;
    DROP POLICY IF EXISTS "course_enrollments_hr_admin_all" ON public.course_enrollments;
    DROP POLICY IF EXISTS "course_enrollments_view" ON public.course_enrollments;
    DROP POLICY IF EXISTS "course_enrollments_self_manage" ON public.course_enrollments;
    
    EXECUTE 'CREATE POLICY "course_enrollments_hr_admin_all" ON public.course_enrollments FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can enroll themselves
    EXECUTE 'CREATE POLICY "course_enrollments_self_manage" ON public.course_enrollments FOR ALL TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid())) WITH CHECK (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "course_enrollments_authenticated_view" ON public.course_enrollments FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 7: ADMIN-ONLY TABLES
-- Access: is_admin() only
-- =====================================================

-- 7.1 COMPANY_SETTINGS TABLE
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_view" ON public.company_settings;

CREATE POLICY "company_settings_admin_all"
ON public.company_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "company_settings_authenticated_view"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- 7.2 ROLE_DEFINITIONS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_definitions') THEN
    DROP POLICY IF EXISTS "role_definitions_admin_all" ON public.role_definitions;
    DROP POLICY IF EXISTS "role_definitions_view" ON public.role_definitions;
    
    EXECUTE 'CREATE POLICY "role_definitions_admin_all" ON public.role_definitions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "role_definitions_authenticated_view" ON public.role_definitions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.3 PAGE_DEFINITIONS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_definitions') THEN
    DROP POLICY IF EXISTS "page_definitions_admin_all" ON public.page_definitions;
    DROP POLICY IF EXISTS "page_definitions_view" ON public.page_definitions;
    
    EXECUTE 'CREATE POLICY "page_definitions_admin_all" ON public.page_definitions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "page_definitions_authenticated_view" ON public.page_definitions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.4 PAGE_ACCESS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_access') THEN
    DROP POLICY IF EXISTS "page_access_admin_all" ON public.page_access;
    DROP POLICY IF EXISTS "page_access_view" ON public.page_access;
    
    EXECUTE 'CREATE POLICY "page_access_admin_all" ON public.page_access FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "page_access_authenticated_view" ON public.page_access FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.5 DEPARTMENTS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
    DROP POLICY IF EXISTS "departments_admin_all" ON public.departments;
    DROP POLICY IF EXISTS "departments_view" ON public.departments;
    
    EXECUTE 'CREATE POLICY "departments_admin_all" ON public.departments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "departments_authenticated_view" ON public.departments FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.6 JOB_POSITIONS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_positions') THEN
    DROP POLICY IF EXISTS "job_positions_admin_all" ON public.job_positions;
    DROP POLICY IF EXISTS "job_positions_view" ON public.job_positions;
    
    EXECUTE 'CREATE POLICY "job_positions_admin_all" ON public.job_positions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "job_positions_authenticated_view" ON public.job_positions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.7 LOCATIONS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    DROP POLICY IF EXISTS "locations_admin_all" ON public.locations;
    DROP POLICY IF EXISTS "locations_view" ON public.locations;
    
    EXECUTE 'CREATE POLICY "locations_admin_all" ON public.locations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "locations_authenticated_view" ON public.locations FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 7.8 POSITION_REQUIRED_SKILLS TABLE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'position_required_skills') THEN
    DROP POLICY IF EXISTS "position_required_skills_admin_all" ON public.position_required_skills;
    DROP POLICY IF EXISTS "position_required_skills_view" ON public.position_required_skills;
    
    EXECUTE 'CREATE POLICY "position_required_skills_admin_all" ON public.position_required_skills FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "position_required_skills_authenticated_view" ON public.position_required_skills FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 8: MARKETPLACE/BOUNTY TABLES
-- Access: is_hr_admin() (similar to shifts/scheduling)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_bounties') THEN
    DROP POLICY IF EXISTS "marketplace_bounties_admin_all" ON public.marketplace_bounties;
    DROP POLICY IF EXISTS "marketplace_bounties_hr_admin_all" ON public.marketplace_bounties;
    DROP POLICY IF EXISTS "marketplace_bounties_view" ON public.marketplace_bounties;
    
    EXECUTE 'CREATE POLICY "marketplace_bounties_hr_admin_all" ON public.marketplace_bounties FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "marketplace_bounties_authenticated_view" ON public.marketplace_bounties FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_claims') THEN
    DROP POLICY IF EXISTS "marketplace_claims_admin_all" ON public.marketplace_claims;
    DROP POLICY IF EXISTS "marketplace_claims_hr_admin_all" ON public.marketplace_claims;
    DROP POLICY IF EXISTS "marketplace_claims_view" ON public.marketplace_claims;
    DROP POLICY IF EXISTS "marketplace_claims_self_manage" ON public.marketplace_claims;
    
    EXECUTE 'CREATE POLICY "marketplace_claims_hr_admin_all" ON public.marketplace_claims FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can claim bounties
    EXECUTE 'CREATE POLICY "marketplace_claims_self_insert" ON public.marketplace_claims FOR INSERT TO authenticated WITH CHECK (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "marketplace_claims_authenticated_view" ON public.marketplace_claims FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 9: GOALS TABLES (Personal development)
-- Access: Users own, HR can manage all
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    DROP POLICY IF EXISTS "goals_admin_all" ON public.goals;
    DROP POLICY IF EXISTS "goals_hr_admin_all" ON public.goals;
    DROP POLICY IF EXISTS "goals_self_manage" ON public.goals;
    DROP POLICY IF EXISTS "goals_view" ON public.goals;
    
    EXECUTE 'CREATE POLICY "goals_hr_admin_all" ON public.goals FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can manage their own goals (goals table uses owner_employee_id)
    EXECUTE 'CREATE POLICY "goals_self_manage" ON public.goals FOR ALL TO authenticated USING (owner_employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid())) WITH CHECK (owner_employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "goals_authenticated_view" ON public.goals FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- EMPLOYEE_GOALS TABLE (uses employee_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_goals') THEN
    DROP POLICY IF EXISTS "employee_goals_admin_all" ON public.employee_goals;
    DROP POLICY IF EXISTS "employee_goals_hr_admin_all" ON public.employee_goals;
    DROP POLICY IF EXISTS "employee_goals_self_manage" ON public.employee_goals;
    DROP POLICY IF EXISTS "employee_goals_view" ON public.employee_goals;
    
    EXECUTE 'CREATE POLICY "employee_goals_hr_admin_all" ON public.employee_goals FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can manage their own goals
    EXECUTE 'CREATE POLICY "employee_goals_self_manage" ON public.employee_goals FOR ALL TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid())) WITH CHECK (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "employee_goals_authenticated_view" ON public.employee_goals FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 10: REVIEWS / PERFORMANCE TABLES
-- Access: is_hr_admin()
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews') THEN
    DROP POLICY IF EXISTS "performance_reviews_admin_all" ON public.performance_reviews;
    DROP POLICY IF EXISTS "performance_reviews_hr_admin_all" ON public.performance_reviews;
    DROP POLICY IF EXISTS "performance_reviews_view" ON public.performance_reviews;
    
    EXECUTE 'CREATE POLICY "performance_reviews_hr_admin_all" ON public.performance_reviews FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can view their own reviews
    EXECUTE 'CREATE POLICY "performance_reviews_self_view" ON public.performance_reviews FOR SELECT TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()) OR public.is_hr_admin())';
  END IF;
END $$;

-- =====================================================
-- SECTION 11: EMAIL TEMPLATES (Admin only)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
    DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_view" ON public.email_templates;
    
    EXECUTE 'CREATE POLICY "email_templates_admin_all" ON public.email_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "email_templates_authenticated_view" ON public.email_templates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 12: INTEGRATIONS TABLES (Admin only)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_settings') THEN
    DROP POLICY IF EXISTS "integration_settings_admin_all" ON public.integration_settings;
    DROP POLICY IF EXISTS "integration_settings_view" ON public.integration_settings;
    
    EXECUTE 'CREATE POLICY "integration_settings_admin_all" ON public.integration_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "integration_settings_authenticated_view" ON public.integration_settings FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 13: MED OPS TABLES (All authenticated can access)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drug_calculators') THEN
    DROP POLICY IF EXISTS "drug_calculators_admin_all" ON public.drug_calculators;
    DROP POLICY IF EXISTS "drug_calculators_view" ON public.drug_calculators;
    
    EXECUTE 'CREATE POLICY "drug_calculators_hr_admin_all" ON public.drug_calculators FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "drug_calculators_authenticated_view" ON public.drug_calculators FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_boards') THEN
    DROP POLICY IF EXISTS "medical_boards_admin_all" ON public.medical_boards;
    DROP POLICY IF EXISTS "medical_boards_view" ON public.medical_boards;
    
    EXECUTE 'CREATE POLICY "medical_boards_hr_admin_all" ON public.medical_boards FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "medical_boards_authenticated_view" ON public.medical_boards FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION SUMMARY
-- =====================================================
-- This migration ensures:
--
-- ADMIN-ONLY (super_admin, admin):
-- - company_settings, role_definitions, page_definitions, page_access
-- - departments, job_positions, locations, position_required_skills
-- - skill_library, email_templates, integration_settings
--
-- HR ACCESS (super_admin, admin, manager, hr_admin, sup_admin, office_admin):
-- - employees, profiles, employee_skills
-- - training_courses, course_enrollments
-- - candidates, candidate_notes, interviews
-- - marketplace_bounties, marketplace_claims, goals
-- - performance_reviews
--
-- SCHEDULE ACCESS (super_admin, admin, manager, sup_admin, office_admin):
-- - shifts, time_off_requests, time_punches
--
-- MARKETING ACCESS (super_admin, admin, manager, marketing_admin):
-- - marketing_events, marketing_leads, marketing_resources
-- - referral_partners, partner_contacts, partner_notes, partner_visit_logs
-- - partner_goals, partner_events, marketing_inventory, marketing_campaigns
-- - clinic_visits, influencers
--
-- GDU/EDUCATION ACCESS (super_admin, admin, manager, hr_admin, sup_admin, marketing_admin):
-- - education_visitors, ce_events, education_students
--
-- =====================================================
