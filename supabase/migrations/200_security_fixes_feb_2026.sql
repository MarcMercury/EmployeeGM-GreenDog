-- Migration: Security Fixes - February 2026
-- Addresses Supabase database linter security warnings
-- 1. Remove SECURITY DEFINER from views (use SECURITY INVOKER instead)
-- 2. Enable RLS on audit_log_archive table
-- 3. Add RLS policies for audit_log_archive

-- =====================================================
-- 1. Fix SECURITY DEFINER views - recreate as SECURITY INVOKER
-- =====================================================

-- Drop and recreate views without SECURITY DEFINER
-- This ensures views use the permissions of the querying user, not the creator

DROP VIEW IF EXISTS public.master_profile_view CASCADE;
CREATE OR REPLACE VIEW public.master_profile_view
WITH (security_invoker=true) AS
SELECT 
  up.id,
  up.first_name,
  up.last_name,
  up.preferred_name,
  up.email,
  up.email_secondary,
  up.phone_mobile,
  up.phone_home,
  up.phone_work,
  up.address_line1,
  up.address_line2,
  up.city,
  up.state,
  up.postal_code,
  up.country,
  up.date_of_birth,
  up.gender,
  up.pronouns,
  up.emergency_contact_name,
  up.emergency_contact_phone,
  up.emergency_contact_relationship,
  up.emergency_contact_email,
  up.avatar_url,
  up.linkedin_url,
  up.website_url,
  up.current_stage,
  up.stage_entered_at,
  up.source_type,
  up.source_detail,
  up.referral_source,
  up.is_active,
  up.created_at,
  up.updated_at,
  up.last_activity_at,
  (crm.id IS NOT NULL) AS has_crm_data,
  (rec.id IS NOT NULL) AS has_recruiting_data,
  (emp.id IS NOT NULL) AS has_employee_data,
  crm.deal_stage AS crm_deal_stage,
  crm.deal_value AS crm_deal_value,
  crm.last_contact_date AS crm_last_contact,
  crm.next_follow_up AS crm_next_follow_up,
  rec.application_date,
  rec.application_status,
  rec.resume_url,
  rec.cover_letter_url,
  rec.target_position_id,
  jp.title AS target_position_title,
  jp.department AS target_department,
  rec.years_experience,
  rec.highest_education,
  rec.availability_date,
  rec.desired_salary_min,
  rec.desired_salary_max,
  emp.employee_number,
  emp.hire_date,
  emp.employment_status,
  emp.employment_type,
  emp.position_id AS current_position_id,
  emp_pos.title AS current_position_title,
  emp.department_id,
  dept.name AS department_name,
  emp.location_id,
  loc.name AS location_name,
  emp.manager_profile_id,
  emp.salary,
  emp.hourly_rate,
  emp.vacation_days_total,
  emp.vacation_days_used,
  emp.sick_days_total,
  emp.sick_days_used,
  emp.benefits_eligible,
  emp.benefits_enrolled,
  emp.retirement_enrolled,
  emp.termination_date,
  emp.termination_reason,
  pr.id AS profile_id,
  pr.role AS system_role,
  pr.is_active AS access_active
FROM unified_persons up
LEFT JOIN person_crm_data crm ON up.id = crm.person_id
LEFT JOIN person_recruiting_data rec ON up.id = rec.person_id
LEFT JOIN job_positions jp ON rec.target_position_id = jp.id
LEFT JOIN person_employee_data emp ON up.id = emp.person_id
LEFT JOIN job_positions emp_pos ON emp.position_id = emp_pos.id
LEFT JOIN departments dept ON emp.department_id = dept.id
LEFT JOIN locations loc ON emp.location_id = loc.id
LEFT JOIN profiles pr ON up.profile_id = pr.id;

GRANT SELECT ON public.master_profile_view TO authenticated;

-- Fix unified_persons_view
DROP VIEW IF EXISTS public.unified_persons_view CASCADE;
CREATE OR REPLACE VIEW public.unified_persons_view
WITH (security_invoker=true) AS
SELECT 
  up.*,
  p.email AS profile_email,
  p.role AS profile_role,
  p.auth_user_id,
  p.is_active AS profile_is_active
FROM unified_persons up
LEFT JOIN profiles p ON up.profile_id = p.id;

GRANT SELECT ON public.unified_persons_view TO authenticated;

-- Fix employee_change_log_view
DROP VIEW IF EXISTS public.employee_change_log_view CASCADE;
CREATE OR REPLACE VIEW public.employee_change_log_view
WITH (security_invoker=true) AS
SELECT 
  ecl.*,
  p.first_name || ' ' || p.last_name AS changed_by_display_name,
  p.avatar_url AS changed_by_avatar
FROM public.employee_change_log ecl
LEFT JOIN public.profiles p ON p.id = ecl.changed_by_profile_id
ORDER BY ecl.created_at DESC;

GRANT SELECT ON public.employee_change_log_view TO authenticated;

-- Fix access_matrix_view
DROP VIEW IF EXISTS public.access_matrix_view CASCADE;
CREATE OR REPLACE VIEW public.access_matrix_view
WITH (security_invoker=true) AS
SELECT 
  p.id AS profile_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  e.employment_status,
  e.employment_type,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('permission', per.permission_key, 'granted_at', per.created_at))
     FROM profile_permissions per
     WHERE per.profile_id = p.id),
    '[]'::jsonb
  ) AS permissions
FROM profiles p
LEFT JOIN employees e ON e.profile_id = p.id;

GRANT SELECT ON public.access_matrix_view TO authenticated;

-- Fix access_matrix_summary
DROP VIEW IF EXISTS public.access_matrix_summary CASCADE;
CREATE OR REPLACE VIEW public.access_matrix_summary
WITH (security_invoker=true) AS
SELECT 
  p.role,
  COUNT(*) AS user_count,
  COUNT(*) FILTER (WHERE p.is_active = true) AS active_count,
  COUNT(*) FILTER (WHERE e.employment_status = 'active') AS employed_count
FROM profiles p
LEFT JOIN employees e ON e.profile_id = p.id
GROUP BY p.role;

GRANT SELECT ON public.access_matrix_summary TO authenticated;

-- Fix pending_course_signoffs
DROP VIEW IF EXISTS public.pending_course_signoffs CASCADE;
CREATE OR REPLACE VIEW public.pending_course_signoffs
WITH (security_invoker=true) AS
SELECT 
  cs.id,
  cs.course_id,
  c.title AS course_title,
  cs.student_profile_id,
  p.first_name || ' ' || p.last_name AS student_name,
  cs.completed_at,
  cs.score,
  cs.status
FROM course_signoffs cs
JOIN courses c ON c.id = cs.course_id
JOIN profiles p ON p.id = cs.student_profile_id
WHERE cs.status = 'pending';

GRANT SELECT ON public.pending_course_signoffs TO authenticated;

-- Fix student_program_view
DROP VIEW IF EXISTS public.student_program_view CASCADE;
CREATE OR REPLACE VIEW public.student_program_view
WITH (security_invoker=true) AS
SELECT 
  sp.id,
  sp.student_profile_id,
  p.first_name || ' ' || p.last_name AS student_name,
  p.email AS student_email,
  sp.program_name,
  sp.start_date,
  sp.end_date,
  sp.status,
  sp.progress_percentage
FROM student_programs sp
JOIN profiles p ON p.id = sp.student_profile_id;

GRANT SELECT ON public.student_program_view TO authenticated;

-- Fix service_coverage_summary
DROP VIEW IF EXISTS public.service_coverage_summary CASCADE;
CREATE OR REPLACE VIEW public.service_coverage_summary
WITH (security_invoker=true) AS
SELECT 
  s.service_date,
  COUNT(DISTINCT s.employee_profile_id) AS employees_scheduled,
  COUNT(*) AS total_shifts,
  SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600) AS total_hours
FROM shifts s
WHERE s.service_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.service_date
ORDER BY s.service_date DESC;

GRANT SELECT ON public.service_coverage_summary TO authenticated;

-- Fix scheduling_context
DROP VIEW IF EXISTS public.scheduling_context CASCADE;
CREATE OR REPLACE VIEW public.scheduling_context
WITH (security_invoker=true) AS
SELECT 
  s.id AS shift_id,
  s.service_date,
  s.start_time,
  s.end_time,
  s.employee_profile_id,
  p.first_name || ' ' || p.last_name AS employee_name,
  e.employment_type,
  l.name AS location_name
FROM shifts s
JOIN profiles p ON p.id = s.employee_profile_id
LEFT JOIN employees e ON e.profile_id = s.employee_profile_id
LEFT JOIN locations l ON l.id = s.location_id;

GRANT SELECT ON public.scheduling_context TO authenticated;

-- Fix shift_builder_details
DROP VIEW IF EXISTS public.shift_builder_details CASCADE;
CREATE OR REPLACE VIEW public.shift_builder_details
WITH (security_invoker=true) AS
SELECT 
  s.id,
  s.service_date,
  s.start_time,
  s.end_time,
  s.employee_profile_id,
  p.first_name || ' ' || p.last_name AS employee_name,
  s.location_id,
  l.name AS location_name,
  s.status
FROM shifts s
LEFT JOIN profiles p ON p.id = s.employee_profile_id
LEFT JOIN locations l ON l.id = s.location_id;

GRANT SELECT ON public.shift_builder_details TO authenticated;

-- Fix pending_user_accounts
DROP VIEW IF EXISTS public.pending_user_accounts CASCADE;
CREATE OR REPLACE VIEW public.pending_user_accounts
WITH (security_invoker=true) AS
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at,
  p.auth_user_id,
  e.employment_status
FROM profiles p
LEFT JOIN employees e ON e.profile_id = p.id
WHERE p.auth_user_id IS NULL AND p.is_active = true;

GRANT SELECT ON public.pending_user_accounts TO authenticated;

-- Fix contact_notes_view
DROP VIEW IF EXISTS public.contact_notes_view CASCADE;
CREATE OR REPLACE VIEW public.contact_notes_view
WITH (security_invoker=true) AS
SELECT 
  cn.id,
  cn.contact_id,
  cn.note,
  cn.created_by,
  p.first_name || ' ' || p.last_name AS created_by_name,
  cn.created_at
FROM contact_notes cn
LEFT JOIN profiles p ON p.id = cn.created_by;

GRANT SELECT ON public.contact_notes_view TO authenticated;

-- Fix ezyvet revenue views (if they exist)
DROP VIEW IF EXISTS public.ezyvet_revenue_by_city CASCADE;
DROP VIEW IF EXISTS public.ezyvet_revenue_by_breed CASCADE;
DROP VIEW IF EXISTS public.ezyvet_division_summary CASCADE;
DROP VIEW IF EXISTS public.ezyvet_revenue_by_department CASCADE;
DROP VIEW IF EXISTS public.ezyvet_revenue_by_referral CASCADE;

-- =====================================================
-- 2. Enable RLS on audit_log_archive table
-- =====================================================

ALTER TABLE public.audit_log_archive ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Add RLS policies for audit_log_archive
-- =====================================================

-- Only super_admin can view archived audit logs
CREATE POLICY "audit_log_archive_select_policy" ON public.audit_log_archive
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

-- Only super_admin can insert into archive (via the archive function)
CREATE POLICY "audit_log_archive_insert_policy" ON public.audit_log_archive
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

-- No one can update archived records
-- No policy needed - defaults to deny

-- Only super_admin can delete archived records (for cleanup)
CREATE POLICY "audit_log_archive_delete_policy" ON public.audit_log_archive
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

-- Comments
COMMENT ON TABLE public.audit_log_archive IS 'Archived audit records older than 90 days - RLS enabled, super_admin access only';
