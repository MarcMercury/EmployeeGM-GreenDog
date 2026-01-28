-- =====================================================
-- Migration 188: Fix Missing WITH CHECK Clauses on All Tables
-- =====================================================
-- Problem: Many FOR ALL policies are missing WITH CHECK clauses
-- This causes INSERT operations to fail silently even for authorized users.
-- PostgreSQL RLS requires WITH CHECK for INSERT operations.
-- =====================================================

-- =====================================================
-- CRITICAL: Fix candidates table first (Upload feature broken)
-- =====================================================

-- Drop and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Candidates role access" ON public.candidates;
CREATE POLICY "Candidates role access" ON public.candidates
  FOR ALL TO authenticated
  USING (can_access_hr() OR is_admin())
  WITH CHECK (can_access_hr() OR is_admin());

DROP POLICY IF EXISTS "candidates_recruiting_admin_all" ON public.candidates;
CREATE POLICY "candidates_recruiting_admin_all" ON public.candidates
  FOR ALL TO authenticated
  USING (is_recruiting_admin())
  WITH CHECK (is_recruiting_admin());

-- =====================================================
-- Fix candidate-related tables
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage forwards" ON public.candidate_forwards;
CREATE POLICY "Admins can manage forwards" ON public.candidate_forwards
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage interviews" ON public.candidate_interviews;
CREATE POLICY "Admins can manage interviews" ON public.candidate_interviews
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Admins can manage candidate onboarding" ON public.candidate_onboarding;
CREATE POLICY "Admins can manage candidate onboarding" ON public.candidate_onboarding
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage candidate onboarding tasks" ON public.candidate_onboarding_tasks;
CREATE POLICY "Admins can manage candidate onboarding tasks" ON public.candidate_onboarding_tasks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage shadow visits" ON public.candidate_shadow_visits;
CREATE POLICY "Admins can manage shadow visits" ON public.candidate_shadow_visits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin')));

-- =====================================================
-- Fix other frequently used tables
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- Fix employee-related tables
-- =====================================================

DROP POLICY IF EXISTS "Admins manage CE credits" ON public.employee_ce_credits;
CREATE POLICY "Admins manage CE credits" ON public.employee_ce_credits
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins manage CE transactions" ON public.employee_ce_transactions;
CREATE POLICY "Admins manage CE transactions" ON public.employee_ce_transactions
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins Full Access" ON public.employee_compensation;
CREATE POLICY "Admins Full Access" ON public.employee_compensation
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Admins manage compensation" ON public.employee_compensation;
-- Skip if duplicate, previous policy covers it

DROP POLICY IF EXISTS "Admins can manage employee documents" ON public.employee_documents;
CREATE POLICY "Admins can manage employee documents" ON public.employee_documents
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage employee goals" ON public.employee_goals;
DROP POLICY IF EXISTS "Admins can manage all goals" ON public.employee_goals;
CREATE POLICY "Admins can manage employee goals" ON public.employee_goals
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins manage employee licenses" ON public.employee_licenses;
CREATE POLICY "Admins manage employee licenses" ON public.employee_licenses
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage employee locations" ON public.employee_locations;
CREATE POLICY "Admins can manage employee locations" ON public.employee_locations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Employee skills role access" ON public.employee_skills;
CREATE POLICY "Employee skills role access" ON public.employee_skills
  FOR ALL TO authenticated
  USING (is_admin() OR can_access_hr() OR employee_id = current_employee_id())
  WITH CHECK (is_admin() OR can_access_hr() OR employee_id = current_employee_id());

DROP POLICY IF EXISTS "Admins manage time off balances" ON public.employee_time_off_balances;
CREATE POLICY "Admins manage time off balances" ON public.employee_time_off_balances
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- Fix scheduling-related tables
-- =====================================================

DROP POLICY IF EXISTS "draft_slots_modify_admin" ON public.draft_slots;
CREATE POLICY "draft_slots_modify_admin" ON public.draft_slots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')));

DROP POLICY IF EXISTS "availability_modify_admin" ON public.employee_availability;
CREATE POLICY "availability_modify_admin" ON public.employee_availability
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'hr_admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'hr_admin', 'manager')));

-- =====================================================
-- Fix marketing/influencer tables
-- =====================================================

DROP POLICY IF EXISTS "Marketing admins can manage influencer campaigns" ON public.influencer_campaigns;
CREATE POLICY "Marketing admins can manage influencer campaigns" ON public.influencer_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')));

DROP POLICY IF EXISTS "Marketing admins can manage influencer content" ON public.influencer_content;
CREATE POLICY "Marketing admins can manage influencer content" ON public.influencer_content
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')));

DROP POLICY IF EXISTS "Marketing admins can manage influencer notes" ON public.influencer_notes;
CREATE POLICY "Marketing admins can manage influencer notes" ON public.influencer_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')));

-- =====================================================
-- Fix AI-related tables
-- =====================================================

DROP POLICY IF EXISTS "HR can view parsed documents" ON public.ai_parsed_documents;
CREATE POLICY "HR can view parsed documents" ON public.ai_parsed_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin', 'marketing_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin', 'marketing_admin')));

DROP POLICY IF EXISTS "Managers can view AI schedules" ON public.ai_schedule_suggestions;
CREATE POLICY "Managers can view AI schedules" ON public.ai_schedule_suggestions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin')));

-- =====================================================
-- Fix event and education tables
-- =====================================================

DROP POLICY IF EXISTS "Admin/HR can manage event supplies" ON public.event_supplies;
CREATE POLICY "Admin/HR can manage event supplies" ON public.event_supplies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin', 'marketing_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin', 'marketing_admin')));

DROP POLICY IF EXISTS "Education visitors role access" ON public.education_visitors;
CREATE POLICY "Education visitors role access" ON public.education_visitors
  FOR ALL TO authenticated
  USING (is_admin() OR can_access_marketing() OR can_access_hr())
  WITH CHECK (is_admin() OR can_access_marketing() OR can_access_hr());

DROP POLICY IF EXISTS "HR can view compliance alerts" ON public.compliance_alerts;
CREATE POLICY "HR can view compliance alerts" ON public.compliance_alerts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'manager', 'hr_admin')));

-- =====================================================
-- Summary comment
-- =====================================================
COMMENT ON POLICY "Candidates role access" ON public.candidates IS 
  'Fixed: Added WITH CHECK clause to allow INSERT operations for HR and admin roles';
