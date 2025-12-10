-- =====================================================
-- Employee GM - Green Dog Dental
-- Security: RLS Policies & Auth Trigger
-- =====================================================

-- =====================================================
-- ROW LEVEL SECURITY - Enable on all tables
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
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
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

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profile_roles pr
    JOIN public.roles r ON pr.role_id = r.id
    JOIN public.profiles p ON pr.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND r.key IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Get current profile ID
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin() OR auth_user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: roles, permissions (read-only for users)
-- =====================================================
CREATE POLICY "All authenticated users can view roles"
  ON public.roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (public.is_admin());

CREATE POLICY "All authenticated users can view permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: employees
-- =====================================================
CREATE POLICY "Users can view their own employee record"
  ON public.employees FOR SELECT
  USING (profile_id = public.current_profile_id());

CREATE POLICY "Admins can view all employees"
  ON public.employees FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: locations, departments, job_positions (read all)
-- =====================================================
CREATE POLICY "All authenticated users can view locations"
  ON public.locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage locations"
  ON public.locations FOR ALL
  USING (public.is_admin());

CREATE POLICY "All authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (public.is_admin());

CREATE POLICY "All authenticated users can view job positions"
  ON public.job_positions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage job positions"
  ON public.job_positions FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: skill_library, employee_skills
-- =====================================================
CREATE POLICY "All authenticated users can view skill library"
  ON public.skill_library FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage skill library"
  ON public.skill_library FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own skills"
  ON public.employee_skills FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Admins can view all employee skills"
  ON public.employee_skills FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage employee skills"
  ON public.employee_skills FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: shifts, schedules
-- =====================================================
CREATE POLICY "Users can view their own shifts"
  ON public.shifts FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Admins can view all shifts"
  ON public.shifts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage shifts"
  ON public.shifts FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own work schedules"
  ON public.work_schedules FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Admins can manage work schedules"
  ON public.work_schedules FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: time_off
-- =====================================================
CREATE POLICY "All authenticated users can view time off types"
  ON public.time_off_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage time off types"
  ON public.time_off_types FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own time off requests"
  ON public.time_off_requests FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Admins can view all time off requests"
  ON public.time_off_requests FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert their own time off requests"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (employee_id = public.current_employee_id());

CREATE POLICY "Admins can manage time off requests"
  ON public.time_off_requests FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: training
-- =====================================================
CREATE POLICY "All authenticated users can view training courses"
  ON public.training_courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage training courses"
  ON public.training_courses FOR ALL
  USING (public.is_admin());

CREATE POLICY "All authenticated users can view training lessons"
  ON public.training_lessons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own training enrollments"
  ON public.training_enrollments FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Admins can manage training enrollments"
  ON public.training_enrollments FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own training progress"
  ON public.training_progress FOR SELECT
  USING (employee_id = public.current_employee_id());

CREATE POLICY "Users can update their own training progress"
  ON public.training_progress FOR UPDATE
  USING (employee_id = public.current_employee_id());

-- =====================================================
-- RLS POLICIES: marketing (admin only)
-- =====================================================
CREATE POLICY "Admins can manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage leads"
  ON public.leads FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage lead activities"
  ON public.lead_activities FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage social accounts"
  ON public.social_accounts FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage social posts"
  ON public.social_posts FOR ALL
  USING (public.is_admin());

-- =====================================================
-- RLS POLICIES: notifications
-- =====================================================
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (profile_id = public.current_profile_id());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (profile_id = public.current_profile_id());

-- =====================================================
-- RLS POLICIES: announcements (read all, admin write)
-- =====================================================
CREATE POLICY "All authenticated users can view announcements"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_admin());

-- =====================================================
-- AUTH TRIGGER: Create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
