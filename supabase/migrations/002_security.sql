-- =====================================================
-- Employee GM - Green Dog Dental
-- CONSOLIDATED SECURITY - RLS, Triggers, Helper Functions
-- Last updated: December 2024
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- Uses SECURITY DEFINER to bypass RLS
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- =====================================================
-- HELPER FUNCTION: Get current profile ID
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO service_role;

-- =====================================================
-- HELPER FUNCTION: Get current employee ID
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT e.id FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO service_role;

-- =====================================================
-- DEBUG HELPER: Test auth lookup
-- =====================================================
CREATE OR REPLACE FUNCTION public.test_auth_lookup(test_email TEXT)
RETURNS TABLE (
  profile_exists BOOLEAN,
  profile_id UUID,
  profile_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as profile_exists,
    p.id as profile_id,
    p.role as profile_role
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(test_email)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO service_role;

-- =====================================================
-- AUTH TRIGGER: Create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, role)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN LOWER(NEW.email) = 'marc.h.mercury@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_employees_modtime BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_shifts_modtime BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- MARKETING LEADS: Set name from parts
-- =====================================================
CREATE OR REPLACE FUNCTION set_lead_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_name IS NULL OR NEW.lead_name = '' THEN
    NEW.lead_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_leads_set_name
  BEFORE INSERT ON public.marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION set_lead_name_from_parts();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_ce_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_ce_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_template_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_off_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_pay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: PROFILES
-- =====================================================
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin() OR auth_user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: ROLES & PERMISSIONS
-- =====================================================
CREATE POLICY "All authenticated users can view roles" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated users can view permissions" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: EMPLOYEES (All authenticated can view)
-- =====================================================
CREATE POLICY "All authenticated users can view employees" ON public.employees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own employee record" ON public.employees FOR UPDATE USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: EMPLOYEE LOCATIONS
-- =====================================================
CREATE POLICY "All authenticated users can view employee locations" ON public.employee_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage employee locations" ON public.employee_locations FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: EMPLOYEE DOCUMENTS
-- =====================================================
CREATE POLICY "Employees can view their own documents" ON public.employee_documents FOR SELECT 
  USING (employee_id IN (SELECT e.id FROM employees e JOIN profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()));
CREATE POLICY "Admins can manage employee documents" ON public.employee_documents FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: EMPLOYEE LICENSES & CE
-- =====================================================
CREATE POLICY "Admins manage employee licenses" ON public.employee_licenses FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage CE credits" ON public.employee_ce_credits FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage CE transactions" ON public.employee_ce_transactions FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: LOCATIONS, DEPARTMENTS, POSITIONS (Read all)
-- =====================================================
CREATE POLICY "All authenticated users can view locations" ON public.locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated users can view departments" ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated users can view job positions" ON public.job_positions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage job positions" ON public.job_positions FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: SKILL LIBRARY & EMPLOYEE SKILLS (All can view)
-- =====================================================
CREATE POLICY "All authenticated users can view skill library" ON public.skill_library FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage skill library" ON public.skill_library FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated users can view employee skills" ON public.employee_skills FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage employee skills" ON public.employee_skills FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: SHIFTS & SCHEDULES
-- =====================================================
CREATE POLICY "Users can view their own shifts" ON public.shifts FOR SELECT USING (employee_id = public.current_employee_id());
CREATE POLICY "Authenticated users can view published shifts" ON public.shifts FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);
CREATE POLICY "Admins can view all shifts" ON public.shifts FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage shifts" ON public.shifts FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their own schedules" ON public.schedules FOR SELECT 
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR employee_id IN (SELECT id FROM employees WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));
CREATE POLICY "Admins can view all schedules" ON public.schedules FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL USING (public.is_admin());

CREATE POLICY "All can view schedule templates" ON public.schedule_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage schedule templates" ON public.schedule_templates FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: TIME OFF
-- =====================================================
CREATE POLICY "All authenticated users can view time off types" ON public.time_off_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage time off types" ON public.time_off_types FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their own time off requests" ON public.time_off_requests FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())) OR profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins can view all time off requests" ON public.time_off_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can create time off requests" ON public.time_off_requests FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));
CREATE POLICY "Admins can update time off requests" ON public.time_off_requests FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins manage time off balances" ON public.employee_time_off_balances FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: TRAINING
-- =====================================================
CREATE POLICY "All authenticated users can view training courses" ON public.training_courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage training courses" ON public.training_courses FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated users can view training lessons" ON public.training_lessons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own training enrollments" ON public.training_enrollments FOR SELECT USING (employee_id = public.current_employee_id());
CREATE POLICY "Admins can manage training enrollments" ON public.training_enrollments FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their own training progress" ON public.training_progress FOR SELECT USING (employee_id = public.current_employee_id());
CREATE POLICY "Users can update their own training progress" ON public.training_progress FOR UPDATE USING (employee_id = public.current_employee_id());

-- =====================================================
-- RLS POLICIES: MARKETING (Admin only + public lead insert)
-- =====================================================
CREATE POLICY "Admins can view marketing campaigns" ON public.marketing_campaigns FOR SELECT USING (public.is_admin());
CREATE POLICY "All authenticated can view campaigns" ON public.marketing_campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage marketing campaigns" ON public.marketing_campaigns FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage marketing events" ON public.marketing_events FOR ALL USING (public.is_admin());
CREATE POLICY "All authenticated can view events" ON public.marketing_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage marketing leads" ON public.marketing_leads FOR ALL USING (public.is_admin());
CREATE POLICY "Public can insert leads" ON public.marketing_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage lead activities" ON public.lead_activities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage social accounts" ON public.social_accounts FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage social posts" ON public.social_posts FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: REFERRAL PARTNERS
-- =====================================================
CREATE POLICY "All authenticated can view partners" ON public.referral_partners FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage referral partners" ON public.referral_partners FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage partner visit logs" ON public.partner_visit_logs FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: RECRUITING
-- =====================================================
CREATE POLICY "Admins can manage candidates" ON public.candidates FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage candidate skills" ON public.candidate_skills FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage onboarding" ON public.onboarding_checklist FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: NOTIFICATIONS
-- =====================================================
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (profile_id = public.current_profile_id());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (profile_id = public.current_profile_id());

-- =====================================================
-- RLS POLICIES: ANNOUNCEMENTS (Read all, admin write)
-- =====================================================
CREATE POLICY "All authenticated users can view announcements" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: EMPLOYEE GOALS
-- =====================================================
CREATE POLICY "Employees can view own goals" ON public.employee_goals FOR SELECT
  USING (employee_id IN (SELECT e.id FROM employees e JOIN profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()));
CREATE POLICY "Employees can create own goals" ON public.employee_goals FOR INSERT
  WITH CHECK (employee_id IN (SELECT e.id FROM employees e JOIN profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()));
CREATE POLICY "Employees can update own goals" ON public.employee_goals FOR UPDATE
  USING (employee_id IN (SELECT e.id FROM employees e JOIN profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()));
CREATE POLICY "Employees can delete own goals" ON public.employee_goals FOR DELETE
  USING (employee_id IN (SELECT e.id FROM employees e JOIN profiles p ON e.profile_id = p.id WHERE p.auth_user_id = auth.uid()));
CREATE POLICY "Admins can manage all goals" ON public.employee_goals FOR ALL USING (public.is_admin());

-- =====================================================
-- VIEWS
-- =====================================================
CREATE OR REPLACE VIEW public.schedule_with_names AS
SELECT 
  s.*,
  p.first_name,
  p.last_name,
  p.email,
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
  l.name as location_name
FROM public.schedules s
LEFT JOIN public.profiles p ON s.profile_id = p.id
LEFT JOIN public.locations l ON s.location_id = l.id;

CREATE OR REPLACE VIEW public.employee_documents_with_details AS
SELECT 
  ed.*,
  e.first_name || ' ' || e.last_name as employee_name,
  up.email as uploader_email
FROM public.employee_documents ed
LEFT JOIN public.employees e ON ed.employee_id = e.id
LEFT JOIN auth.users up ON ed.uploader_id = up.id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
