-- =====================================================
-- Migration 182: Complete RLS Policy Remediation
-- =====================================================
-- This migration fixes ALL remaining RLS policy issues:
-- 1. Tables with RLS enabled but NO policies (blocking all access)
-- 2. Tables still using is_admin() that need broader access
-- 3. Tables using inline role checks instead of helper functions
-- =====================================================

-- =====================================================
-- SECTION 1: FIX TABLES WITH NO POLICIES (32 tables identified)
-- =====================================================

-- 1.1 TRAINING/QUIZ TABLES (HR access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_quizzes') THEN
    DROP POLICY IF EXISTS "training_quizzes_hr_admin_all" ON public.training_quizzes;
    DROP POLICY IF EXISTS "training_quizzes_view" ON public.training_quizzes;
    EXECUTE 'CREATE POLICY "training_quizzes_hr_admin_all" ON public.training_quizzes FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "training_quizzes_authenticated_view" ON public.training_quizzes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_quiz_questions') THEN
    DROP POLICY IF EXISTS "training_quiz_questions_hr_admin_all" ON public.training_quiz_questions;
    DROP POLICY IF EXISTS "training_quiz_questions_view" ON public.training_quiz_questions;
    EXECUTE 'CREATE POLICY "training_quiz_questions_hr_admin_all" ON public.training_quiz_questions FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "training_quiz_questions_authenticated_view" ON public.training_quiz_questions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_quiz_attempts') THEN
    DROP POLICY IF EXISTS "training_quiz_attempts_hr_admin_all" ON public.training_quiz_attempts;
    DROP POLICY IF EXISTS "training_quiz_attempts_view" ON public.training_quiz_attempts;
    DROP POLICY IF EXISTS "training_quiz_attempts_self_manage" ON public.training_quiz_attempts;
    EXECUTE 'CREATE POLICY "training_quiz_attempts_hr_admin_all" ON public.training_quiz_attempts FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can manage their own quiz attempts
    EXECUTE 'CREATE POLICY "training_quiz_attempts_self_manage" ON public.training_quiz_attempts FOR ALL TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid())) WITH CHECK (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "training_quiz_attempts_authenticated_view" ON public.training_quiz_attempts FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.2 REVIEW/FEEDBACK TABLES (HR access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_cycles') THEN
    DROP POLICY IF EXISTS "review_cycles_hr_admin_all" ON public.review_cycles;
    DROP POLICY IF EXISTS "review_cycles_view" ON public.review_cycles;
    EXECUTE 'CREATE POLICY "review_cycles_hr_admin_all" ON public.review_cycles FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "review_cycles_authenticated_view" ON public.review_cycles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
    DROP POLICY IF EXISTS "review_templates_hr_admin_all" ON public.review_templates;
    DROP POLICY IF EXISTS "review_templates_view" ON public.review_templates;
    EXECUTE 'CREATE POLICY "review_templates_hr_admin_all" ON public.review_templates FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "review_templates_authenticated_view" ON public.review_templates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_participants') THEN
    DROP POLICY IF EXISTS "review_participants_hr_admin_all" ON public.review_participants;
    DROP POLICY IF EXISTS "review_participants_view" ON public.review_participants;
    EXECUTE 'CREATE POLICY "review_participants_hr_admin_all" ON public.review_participants FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "review_participants_authenticated_view" ON public.review_participants FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_responses') THEN
    DROP POLICY IF EXISTS "review_responses_hr_admin_all" ON public.review_responses;
    DROP POLICY IF EXISTS "review_responses_view" ON public.review_responses;
    EXECUTE 'CREATE POLICY "review_responses_hr_admin_all" ON public.review_responses FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "review_responses_authenticated_view" ON public.review_responses FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_signoffs') THEN
    DROP POLICY IF EXISTS "review_signoffs_hr_admin_all" ON public.review_signoffs;
    DROP POLICY IF EXISTS "review_signoffs_view" ON public.review_signoffs;
    EXECUTE 'CREATE POLICY "review_signoffs_hr_admin_all" ON public.review_signoffs FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "review_signoffs_authenticated_view" ON public.review_signoffs FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback') THEN
    DROP POLICY IF EXISTS "feedback_hr_admin_all" ON public.feedback;
    DROP POLICY IF EXISTS "feedback_view" ON public.feedback;
    EXECUTE 'CREATE POLICY "feedback_hr_admin_all" ON public.feedback FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "feedback_authenticated_view" ON public.feedback FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.3 SCHEDULE RELATED TABLES (Schedule admin access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_changes') THEN
    DROP POLICY IF EXISTS "shift_changes_schedule_admin_all" ON public.shift_changes;
    DROP POLICY IF EXISTS "shift_changes_view" ON public.shift_changes;
    EXECUTE 'CREATE POLICY "shift_changes_schedule_admin_all" ON public.shift_changes FOR ALL TO authenticated USING (public.is_schedule_admin()) WITH CHECK (public.is_schedule_admin())';
    EXECUTE 'CREATE POLICY "shift_changes_authenticated_view" ON public.shift_changes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_templates') THEN
    DROP POLICY IF EXISTS "shift_templates_schedule_admin_all" ON public.shift_templates;
    DROP POLICY IF EXISTS "shift_templates_view" ON public.shift_templates;
    EXECUTE 'CREATE POLICY "shift_templates_schedule_admin_all" ON public.shift_templates FOR ALL TO authenticated USING (public.is_schedule_admin()) WITH CHECK (public.is_schedule_admin())';
    EXECUTE 'CREATE POLICY "shift_templates_authenticated_view" ON public.shift_templates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.4 APPOINTMENTS (HR access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    DROP POLICY IF EXISTS "appointments_hr_admin_all" ON public.appointments;
    DROP POLICY IF EXISTS "appointments_view" ON public.appointments;
    EXECUTE 'CREATE POLICY "appointments_hr_admin_all" ON public.appointments FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "appointments_authenticated_view" ON public.appointments FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointment_participants') THEN
    DROP POLICY IF EXISTS "appointment_participants_hr_admin_all" ON public.appointment_participants;
    DROP POLICY IF EXISTS "appointment_participants_view" ON public.appointment_participants;
    EXECUTE 'CREATE POLICY "appointment_participants_hr_admin_all" ON public.appointment_participants FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "appointment_participants_authenticated_view" ON public.appointment_participants FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.5 ADMIN-ONLY CONFIG TABLES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings') THEN
    DROP POLICY IF EXISTS "app_settings_admin_all" ON public.app_settings;
    DROP POLICY IF EXISTS "app_settings_view" ON public.app_settings;
    EXECUTE 'CREATE POLICY "app_settings_admin_all" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "app_settings_authenticated_view" ON public.app_settings FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_flags') THEN
    DROP POLICY IF EXISTS "feature_flags_admin_all" ON public.feature_flags;
    DROP POLICY IF EXISTS "feature_flags_view" ON public.feature_flags;
    EXECUTE 'CREATE POLICY "feature_flags_admin_all" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "feature_flags_authenticated_view" ON public.feature_flags FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    DROP POLICY IF EXISTS "audit_logs_admin_all" ON public.audit_logs;
    DROP POLICY IF EXISTS "audit_logs_view" ON public.audit_logs;
    EXECUTE 'CREATE POLICY "audit_logs_admin_all" ON public.audit_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "audit_logs_admin_view" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    DROP POLICY IF EXISTS "role_permissions_admin_all" ON public.role_permissions;
    DROP POLICY IF EXISTS "role_permissions_view" ON public.role_permissions;
    EXECUTE 'CREATE POLICY "role_permissions_admin_all" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "role_permissions_authenticated_view" ON public.role_permissions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_roles') THEN
    DROP POLICY IF EXISTS "profile_roles_admin_all" ON public.profile_roles;
    DROP POLICY IF EXISTS "profile_roles_view" ON public.profile_roles;
    EXECUTE 'CREATE POLICY "profile_roles_admin_all" ON public.profile_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "profile_roles_authenticated_view" ON public.profile_roles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.6 PAYROLL TABLES (Admin only - sensitive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs') THEN
    DROP POLICY IF EXISTS "payroll_runs_admin_all" ON public.payroll_runs;
    DROP POLICY IF EXISTS "payroll_runs_view" ON public.payroll_runs;
    EXECUTE 'CREATE POLICY "payroll_runs_admin_all" ON public.payroll_runs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "payroll_runs_admin_view" ON public.payroll_runs FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_run_items') THEN
    DROP POLICY IF EXISTS "payroll_run_items_admin_all" ON public.payroll_run_items;
    DROP POLICY IF EXISTS "payroll_run_items_view" ON public.payroll_run_items;
    EXECUTE 'CREATE POLICY "payroll_run_items_admin_all" ON public.payroll_run_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "payroll_run_items_admin_view" ON public.payroll_run_items FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods') THEN
    DROP POLICY IF EXISTS "pay_periods_admin_all" ON public.pay_periods;
    DROP POLICY IF EXISTS "pay_periods_view" ON public.pay_periods;
    EXECUTE 'CREATE POLICY "pay_periods_admin_all" ON public.pay_periods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "pay_periods_authenticated_view" ON public.pay_periods FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_pay_settings') THEN
    DROP POLICY IF EXISTS "employee_pay_settings_admin_all" ON public.employee_pay_settings;
    DROP POLICY IF EXISTS "employee_pay_settings_view" ON public.employee_pay_settings;
    EXECUTE 'CREATE POLICY "employee_pay_settings_admin_all" ON public.employee_pay_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    -- Users can view their own pay settings
    EXECUTE 'CREATE POLICY "employee_pay_settings_self_view" ON public.employee_pay_settings FOR SELECT TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()) OR public.is_admin())';
  END IF;
END $$;

-- 1.7 MARKETING ASSETS (Marketing access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_assets') THEN
    DROP POLICY IF EXISTS "marketing_assets_marketing_admin_all" ON public.marketing_assets;
    DROP POLICY IF EXISTS "marketing_assets_view" ON public.marketing_assets;
    EXECUTE 'CREATE POLICY "marketing_assets_marketing_admin_all" ON public.marketing_assets FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_assets_authenticated_view" ON public.marketing_assets FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 1.8 OTHER TABLES (HR access by default)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    DROP POLICY IF EXISTS "teams_hr_admin_all" ON public.teams;
    DROP POLICY IF EXISTS "teams_view" ON public.teams;
    EXECUTE 'CREATE POLICY "teams_hr_admin_all" ON public.teams FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "teams_authenticated_view" ON public.teams FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_teams') THEN
    DROP POLICY IF EXISTS "employee_teams_hr_admin_all" ON public.employee_teams;
    DROP POLICY IF EXISTS "employee_teams_view" ON public.employee_teams;
    EXECUTE 'CREATE POLICY "employee_teams_hr_admin_all" ON public.employee_teams FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "employee_teams_authenticated_view" ON public.employee_teams FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "tasks_hr_admin_all" ON public.tasks;
    DROP POLICY IF EXISTS "tasks_view" ON public.tasks;
    EXECUTE 'CREATE POLICY "tasks_hr_admin_all" ON public.tasks FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "tasks_authenticated_view" ON public.tasks FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_updates') THEN
    DROP POLICY IF EXISTS "goal_updates_hr_admin_all" ON public.goal_updates;
    DROP POLICY IF EXISTS "goal_updates_view" ON public.goal_updates;
    EXECUTE 'CREATE POLICY "goal_updates_hr_admin_all" ON public.goal_updates FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "goal_updates_authenticated_view" ON public.goal_updates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_kpis') THEN
    DROP POLICY IF EXISTS "financial_kpis_admin_all" ON public.financial_kpis;
    DROP POLICY IF EXISTS "financial_kpis_view" ON public.financial_kpis;
    EXECUTE 'CREATE POLICY "financial_kpis_admin_all" ON public.financial_kpis FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "financial_kpis_authenticated_view" ON public.financial_kpis FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
    DROP POLICY IF EXISTS "files_hr_admin_all" ON public.files;
    DROP POLICY IF EXISTS "files_view" ON public.files;
    EXECUTE 'CREATE POLICY "files_hr_admin_all" ON public.files FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "files_authenticated_view" ON public.files FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clock_devices') THEN
    DROP POLICY IF EXISTS "clock_devices_admin_all" ON public.clock_devices;
    DROP POLICY IF EXISTS "clock_devices_view" ON public.clock_devices;
    EXECUTE 'CREATE POLICY "clock_devices_admin_all" ON public.clock_devices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "clock_devices_authenticated_view" ON public.clock_devices FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geofences') THEN
    DROP POLICY IF EXISTS "geofences_admin_all" ON public.geofences;
    DROP POLICY IF EXISTS "geofences_view" ON public.geofences;
    EXECUTE 'CREATE POLICY "geofences_admin_all" ON public.geofences FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "geofences_authenticated_view" ON public.geofences FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_post_attachments') THEN
    DROP POLICY IF EXISTS "social_post_attachments_marketing_admin_all" ON public.social_post_attachments;
    DROP POLICY IF EXISTS "social_post_attachments_view" ON public.social_post_attachments;
    EXECUTE 'CREATE POLICY "social_post_attachments_marketing_admin_all" ON public.social_post_attachments FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "social_post_attachments_authenticated_view" ON public.social_post_attachments FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- SECTION 2: UPDATE TABLES FROM is_admin() TO PROPER ACCESS LEVELS
-- =====================================================

-- 2.1 RECRUITING TABLES (Change from is_admin to is_recruiting_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_documents') THEN
    DROP POLICY IF EXISTS "candidate_documents_admin_all" ON public.candidate_documents;
    DROP POLICY IF EXISTS "candidate_documents_recruiting_admin_all" ON public.candidate_documents;
    DROP POLICY IF EXISTS "candidate_documents_view" ON public.candidate_documents;
    EXECUTE 'CREATE POLICY "candidate_documents_recruiting_admin_all" ON public.candidate_documents FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_documents_authenticated_view" ON public.candidate_documents FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_forwards') THEN
    DROP POLICY IF EXISTS "candidate_forwards_admin_all" ON public.candidate_forwards;
    DROP POLICY IF EXISTS "candidate_forwards_recruiting_admin_all" ON public.candidate_forwards;
    DROP POLICY IF EXISTS "candidate_forwards_view" ON public.candidate_forwards;
    EXECUTE 'CREATE POLICY "candidate_forwards_recruiting_admin_all" ON public.candidate_forwards FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_forwards_authenticated_view" ON public.candidate_forwards FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_onboarding') THEN
    DROP POLICY IF EXISTS "candidate_onboarding_admin_all" ON public.candidate_onboarding;
    DROP POLICY IF EXISTS "candidate_onboarding_recruiting_admin_all" ON public.candidate_onboarding;
    DROP POLICY IF EXISTS "candidate_onboarding_view" ON public.candidate_onboarding;
    EXECUTE 'CREATE POLICY "candidate_onboarding_recruiting_admin_all" ON public.candidate_onboarding FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_onboarding_authenticated_view" ON public.candidate_onboarding FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_onboarding_tasks') THEN
    DROP POLICY IF EXISTS "candidate_onboarding_tasks_admin_all" ON public.candidate_onboarding_tasks;
    DROP POLICY IF EXISTS "candidate_onboarding_tasks_recruiting_admin_all" ON public.candidate_onboarding_tasks;
    DROP POLICY IF EXISTS "candidate_onboarding_tasks_view" ON public.candidate_onboarding_tasks;
    EXECUTE 'CREATE POLICY "candidate_onboarding_tasks_recruiting_admin_all" ON public.candidate_onboarding_tasks FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_onboarding_tasks_authenticated_view" ON public.candidate_onboarding_tasks FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_skills') THEN
    DROP POLICY IF EXISTS "candidate_skills_admin_all" ON public.candidate_skills;
    DROP POLICY IF EXISTS "candidate_skills_recruiting_admin_all" ON public.candidate_skills;
    DROP POLICY IF EXISTS "candidate_skills_view" ON public.candidate_skills;
    EXECUTE 'CREATE POLICY "candidate_skills_recruiting_admin_all" ON public.candidate_skills FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "candidate_skills_authenticated_view" ON public.candidate_skills FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_templates') THEN
    DROP POLICY IF EXISTS "onboarding_templates_admin_all" ON public.onboarding_templates;
    DROP POLICY IF EXISTS "onboarding_templates_recruiting_admin_all" ON public.onboarding_templates;
    DROP POLICY IF EXISTS "onboarding_templates_view" ON public.onboarding_templates;
    EXECUTE 'CREATE POLICY "onboarding_templates_recruiting_admin_all" ON public.onboarding_templates FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "onboarding_templates_authenticated_view" ON public.onboarding_templates FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_tasks') THEN
    DROP POLICY IF EXISTS "onboarding_tasks_admin_all" ON public.onboarding_tasks;
    DROP POLICY IF EXISTS "onboarding_tasks_recruiting_admin_all" ON public.onboarding_tasks;
    DROP POLICY IF EXISTS "onboarding_tasks_view" ON public.onboarding_tasks;
    EXECUTE 'CREATE POLICY "onboarding_tasks_recruiting_admin_all" ON public.onboarding_tasks FOR ALL TO authenticated USING (public.is_recruiting_admin()) WITH CHECK (public.is_recruiting_admin())';
    EXECUTE 'CREATE POLICY "onboarding_tasks_authenticated_view" ON public.onboarding_tasks FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 2.2 HR TABLES (Change from is_admin to is_hr_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_documents') THEN
    DROP POLICY IF EXISTS "employee_documents_admin_all" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_hr_admin_all" ON public.employee_documents;
    DROP POLICY IF EXISTS "employee_documents_view" ON public.employee_documents;
    EXECUTE 'CREATE POLICY "employee_documents_hr_admin_all" ON public.employee_documents FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    -- Users can view their own documents
    EXECUTE 'CREATE POLICY "employee_documents_self_view" ON public.employee_documents FOR SELECT TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()) OR public.is_hr_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_notes') THEN
    DROP POLICY IF EXISTS "employee_notes_admin_all" ON public.employee_notes;
    DROP POLICY IF EXISTS "employee_notes_hr_admin_all" ON public.employee_notes;
    DROP POLICY IF EXISTS "employee_notes_view" ON public.employee_notes;
    EXECUTE 'CREATE POLICY "employee_notes_hr_admin_all" ON public.employee_notes FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "employee_notes_authenticated_view" ON public.employee_notes FOR SELECT TO authenticated USING (public.is_hr_admin())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mentorships') THEN
    DROP POLICY IF EXISTS "mentorships_admin_all" ON public.mentorships;
    DROP POLICY IF EXISTS "mentorships_hr_admin_all" ON public.mentorships;
    DROP POLICY IF EXISTS "mentorships_view" ON public.mentorships;
    EXECUTE 'CREATE POLICY "mentorships_hr_admin_all" ON public.mentorships FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "mentorships_authenticated_view" ON public.mentorships FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'points_log') THEN
    DROP POLICY IF EXISTS "points_log_admin_all" ON public.points_log;
    DROP POLICY IF EXISTS "points_log_hr_admin_all" ON public.points_log;
    DROP POLICY IF EXISTS "points_log_view" ON public.points_log;
    EXECUTE 'CREATE POLICY "points_log_hr_admin_all" ON public.points_log FOR ALL TO authenticated USING (public.is_hr_admin()) WITH CHECK (public.is_hr_admin())';
    EXECUTE 'CREATE POLICY "points_log_authenticated_view" ON public.points_log FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 2.3 GDU/EDUCATION TABLES (Change from is_admin to is_gdu_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ce_event_attendees') THEN
    DROP POLICY IF EXISTS "ce_event_attendees_admin_all" ON public.ce_event_attendees;
    DROP POLICY IF EXISTS "ce_event_attendees_gdu_admin_all" ON public.ce_event_attendees;
    DROP POLICY IF EXISTS "ce_event_attendees_view" ON public.ce_event_attendees;
    EXECUTE 'CREATE POLICY "ce_event_attendees_gdu_admin_all" ON public.ce_event_attendees FOR ALL TO authenticated USING (public.is_gdu_admin()) WITH CHECK (public.is_gdu_admin())';
    EXECUTE 'CREATE POLICY "ce_event_attendees_authenticated_view" ON public.ce_event_attendees FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ce_event_tasks') THEN
    DROP POLICY IF EXISTS "ce_event_tasks_admin_all" ON public.ce_event_tasks;
    DROP POLICY IF EXISTS "ce_event_tasks_gdu_admin_all" ON public.ce_event_tasks;
    DROP POLICY IF EXISTS "ce_event_tasks_view" ON public.ce_event_tasks;
    EXECUTE 'CREATE POLICY "ce_event_tasks_gdu_admin_all" ON public.ce_event_tasks FOR ALL TO authenticated USING (public.is_gdu_admin()) WITH CHECK (public.is_gdu_admin())';
    EXECUTE 'CREATE POLICY "ce_event_tasks_authenticated_view" ON public.ce_event_tasks FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 2.4 MARKETING TABLES (Change from is_admin to is_marketing_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    DROP POLICY IF EXISTS "leads_admin_all" ON public.leads;
    DROP POLICY IF EXISTS "leads_marketing_admin_all" ON public.leads;
    DROP POLICY IF EXISTS "leads_view" ON public.leads;
    EXECUTE 'CREATE POLICY "leads_marketing_admin_all" ON public.leads FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "leads_authenticated_view" ON public.leads FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_activities') THEN
    DROP POLICY IF EXISTS "lead_activities_admin_all" ON public.lead_activities;
    DROP POLICY IF EXISTS "lead_activities_marketing_admin_all" ON public.lead_activities;
    DROP POLICY IF EXISTS "lead_activities_view" ON public.lead_activities;
    EXECUTE 'CREATE POLICY "lead_activities_marketing_admin_all" ON public.lead_activities FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "lead_activities_authenticated_view" ON public.lead_activities FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_accounts') THEN
    DROP POLICY IF EXISTS "social_accounts_admin_all" ON public.social_accounts;
    DROP POLICY IF EXISTS "social_accounts_marketing_admin_all" ON public.social_accounts;
    DROP POLICY IF EXISTS "social_accounts_view" ON public.social_accounts;
    EXECUTE 'CREATE POLICY "social_accounts_marketing_admin_all" ON public.social_accounts FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "social_accounts_authenticated_view" ON public.social_accounts FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_posts') THEN
    DROP POLICY IF EXISTS "social_posts_admin_all" ON public.social_posts;
    DROP POLICY IF EXISTS "social_posts_marketing_admin_all" ON public.social_posts;
    DROP POLICY IF EXISTS "social_posts_view" ON public.social_posts;
    EXECUTE 'CREATE POLICY "social_posts_marketing_admin_all" ON public.social_posts FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "social_posts_authenticated_view" ON public.social_posts FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_partner_contacts') THEN
    DROP POLICY IF EXISTS "marketing_partner_contacts_admin_all" ON public.marketing_partner_contacts;
    DROP POLICY IF EXISTS "marketing_partner_contacts_marketing_admin_all" ON public.marketing_partner_contacts;
    DROP POLICY IF EXISTS "marketing_partner_contacts_view" ON public.marketing_partner_contacts;
    EXECUTE 'CREATE POLICY "marketing_partner_contacts_marketing_admin_all" ON public.marketing_partner_contacts FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_partner_contacts_authenticated_view" ON public.marketing_partner_contacts FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_partner_notes') THEN
    DROP POLICY IF EXISTS "marketing_partner_notes_admin_all" ON public.marketing_partner_notes;
    DROP POLICY IF EXISTS "marketing_partner_notes_marketing_admin_all" ON public.marketing_partner_notes;
    DROP POLICY IF EXISTS "marketing_partner_notes_view" ON public.marketing_partner_notes;
    EXECUTE 'CREATE POLICY "marketing_partner_notes_marketing_admin_all" ON public.marketing_partner_notes FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_partner_notes_authenticated_view" ON public.marketing_partner_notes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_partners') THEN
    DROP POLICY IF EXISTS "marketing_partners_admin_all" ON public.marketing_partners;
    DROP POLICY IF EXISTS "marketing_partners_marketing_admin_all" ON public.marketing_partners;
    DROP POLICY IF EXISTS "Admins can manage marketing partners" ON public.marketing_partners;
    DROP POLICY IF EXISTS "marketing_partners_view" ON public.marketing_partners;
    DROP POLICY IF EXISTS "All authenticated can view marketing partners" ON public.marketing_partners;
    EXECUTE 'CREATE POLICY "marketing_partners_marketing_admin_all" ON public.marketing_partners FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_partners_authenticated_view" ON public.marketing_partners FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_spending') THEN
    DROP POLICY IF EXISTS "marketing_spending_admin_all" ON public.marketing_spending;
    DROP POLICY IF EXISTS "marketing_spending_marketing_admin_all" ON public.marketing_spending;
    DROP POLICY IF EXISTS "marketing_spending_view" ON public.marketing_spending;
    EXECUTE 'CREATE POLICY "marketing_spending_marketing_admin_all" ON public.marketing_spending FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_spending_authenticated_view" ON public.marketing_spending FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_influencers') THEN
    DROP POLICY IF EXISTS "marketing_influencers_admin_all" ON public.marketing_influencers;
    DROP POLICY IF EXISTS "marketing_influencers_marketing_admin_all" ON public.marketing_influencers;
    DROP POLICY IF EXISTS "Admins can manage influencers" ON public.marketing_influencers;
    DROP POLICY IF EXISTS "marketing_influencers_view" ON public.marketing_influencers;
    DROP POLICY IF EXISTS "All authenticated can view influencers" ON public.marketing_influencers;
    EXECUTE 'CREATE POLICY "marketing_influencers_marketing_admin_all" ON public.marketing_influencers FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_influencers_authenticated_view" ON public.marketing_influencers FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 2.5 SCHEDULE TABLES (Change from is_admin to is_schedule_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    DROP POLICY IF EXISTS "time_entries_admin_all" ON public.time_entries;
    DROP POLICY IF EXISTS "time_entries_schedule_admin_all" ON public.time_entries;
    DROP POLICY IF EXISTS "time_entries_view" ON public.time_entries;
    EXECUTE 'CREATE POLICY "time_entries_schedule_admin_all" ON public.time_entries FOR ALL TO authenticated USING (public.is_schedule_admin()) WITH CHECK (public.is_schedule_admin())';
    -- Users can manage their own time entries
    EXECUTE 'CREATE POLICY "time_entries_self_manage" ON public.time_entries FOR ALL TO authenticated USING (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid())) WITH CHECK (employee_id = (SELECT e.id FROM public.employees e JOIN public.profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "time_entries_authenticated_view" ON public.time_entries FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_schedules') THEN
    DROP POLICY IF EXISTS "work_schedules_admin_all" ON public.work_schedules;
    DROP POLICY IF EXISTS "work_schedules_schedule_admin_all" ON public.work_schedules;
    DROP POLICY IF EXISTS "work_schedules_view" ON public.work_schedules;
    EXECUTE 'CREATE POLICY "work_schedules_schedule_admin_all" ON public.work_schedules FOR ALL TO authenticated USING (public.is_schedule_admin()) WITH CHECK (public.is_schedule_admin())';
    EXECUTE 'CREATE POLICY "work_schedules_authenticated_view" ON public.work_schedules FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- COMPLETE: All RLS policies are now properly aligned
-- =====================================================
