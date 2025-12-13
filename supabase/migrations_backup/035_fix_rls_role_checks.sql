-- =====================================================
-- Migration 035: Fix RLS policies using incorrect role checks
-- Issue: Many policies check profiles.role IN ('admin', 'super_admin')
-- but profiles.role CHECK constraint only allows ('admin', 'user')
-- The correct approach is to use the public.is_admin() helper function
-- =====================================================

-- =====================================================
-- 1. FIX EMPLOYEE_LICENSES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins manage employee licenses" ON public.employee_licenses;
CREATE POLICY "Admins manage employee licenses" ON public.employee_licenses
  FOR ALL USING (public.is_admin());

-- =====================================================
-- 2. FIX EMPLOYEE_CE_CREDITS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins manage CE credits" ON public.employee_ce_credits;
CREATE POLICY "Admins manage CE credits" ON public.employee_ce_credits
  FOR ALL USING (public.is_admin());

-- =====================================================
-- 3. FIX EMPLOYEE_CE_TRANSACTIONS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins manage CE transactions" ON public.employee_ce_transactions;
CREATE POLICY "Admins manage CE transactions" ON public.employee_ce_transactions
  FOR ALL USING (public.is_admin());

-- =====================================================
-- 4. FIX EMPLOYEE_TIME_OFF_BALANCES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins manage time off balances" ON public.employee_time_off_balances;
CREATE POLICY "Admins manage time off balances" ON public.employee_time_off_balances
  FOR ALL USING (public.is_admin());

-- =====================================================
-- 5. FIX EMPLOYEE_DOCUMENTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage employee documents" ON public.employee_documents;
CREATE POLICY "Admins can manage employee documents" ON public.employee_documents
  FOR ALL USING (public.is_admin());

-- Manager policy also needs fixing - 'manager' is not a valid profiles.role value
-- It's in the roles table, so we need to check profile_roles
DROP POLICY IF EXISTS "Managers can view employee documents" ON public.employee_documents;
CREATE POLICY "Managers can view employee documents" ON public.employee_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profile_roles pr
      JOIN public.roles r ON pr.role_id = r.id
      JOIN public.profiles p ON pr.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND r.key = 'manager'
    )
  );

-- =====================================================
-- 6. FIX SCHEDULE_TEMPLATES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage schedule templates" ON public.schedule_templates;
CREATE POLICY "Admins can manage schedule templates" ON public.schedule_templates
  FOR ALL USING (public.is_admin());

-- =====================================================
-- 7. FIX SCHEDULE_TEMPLATE_SHIFTS POLICIES (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule_template_shifts') THEN
    DROP POLICY IF EXISTS "Admins can manage schedule template shifts" ON public.schedule_template_shifts;
    CREATE POLICY "Admins can manage schedule template shifts" ON public.schedule_template_shifts
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- 8. FIX REFERRAL_PARTNERS POLICIES (migration 016)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_partners') THEN
    DROP POLICY IF EXISTS "Admins can manage referral partners" ON public.referral_partners;
    CREATE POLICY "Admins can manage referral partners" ON public.referral_partners
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- 9. FIX RECRUITING MODULE POLICIES (migration 017)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_postings') THEN
    DROP POLICY IF EXISTS "Admins can manage job postings" ON public.job_postings;
    CREATE POLICY "Admins can manage job postings" ON public.job_postings
      FOR ALL USING (public.is_admin());
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_applications') THEN
    DROP POLICY IF EXISTS "Admins can manage job applications" ON public.job_applications;
    CREATE POLICY "Admins can manage job applications" ON public.job_applications
      FOR ALL USING (public.is_admin());
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'interview_schedules') THEN
    DROP POLICY IF EXISTS "Admins can manage interview schedules" ON public.interview_schedules;
    CREATE POLICY "Admins can manage interview schedules" ON public.interview_schedules
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- 10. FIX GROWTH MODULE POLICIES (migration 018)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_goals') THEN
    DROP POLICY IF EXISTS "Admins can manage employee goals" ON public.employee_goals;
    CREATE POLICY "Admins can manage employee goals" ON public.employee_goals
      FOR ALL USING (public.is_admin());
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_development_plans') THEN
    DROP POLICY IF EXISTS "Admins can manage development plans" ON public.employee_development_plans;
    CREATE POLICY "Admins can manage development plans" ON public.employee_development_plans
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- Done - Log the fix
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS policies to use is_admin() helper instead of invalid role checks';
END $$;
