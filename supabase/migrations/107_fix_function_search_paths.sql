-- =====================================================
-- Migration: 107_fix_function_search_paths.sql
-- Purpose: Fix Supabase Advisor security warnings for mutable search_path
-- Uses ALTER FUNCTION to set search_path without changing function signatures
-- =====================================================

-- Helper function to safely alter function search_path
CREATE OR REPLACE FUNCTION pg_temp.safe_alter_search_path(func_sig TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER FUNCTION %s SET search_path = ''''', func_sig);
EXCEPTION WHEN undefined_function THEN
  -- Function doesn't exist, skip silently
  RAISE NOTICE 'Function % does not exist, skipping', func_sig;
END;
$$ LANGUAGE plpgsql;

-- Core helper functions
SELECT pg_temp.safe_alter_search_path('public.is_admin()');
SELECT pg_temp.safe_alter_search_path('public.current_profile_id()');
SELECT pg_temp.safe_alter_search_path('public.current_employee_id()');
SELECT pg_temp.safe_alter_search_path('public.test_auth_lookup(TEXT)');
SELECT pg_temp.safe_alter_search_path('public.get_user_role()');
SELECT pg_temp.safe_alter_search_path('public.get_user_initials()');

-- Access control functions
SELECT pg_temp.safe_alter_search_path('public.has_management_access()');
SELECT pg_temp.safe_alter_search_path('public.has_marketing_access()');
SELECT pg_temp.safe_alter_search_path('public.has_gdu_access()');
SELECT pg_temp.safe_alter_search_path('public.has_admin_ops_access()');

-- Timestamp update functions
SELECT pg_temp.safe_alter_search_path('public.update_modified_column()');
SELECT pg_temp.safe_alter_search_path('public.update_updated_at_column()');
SELECT pg_temp.safe_alter_search_path('public.update_compensation_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_employee_locations_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_referral_partners_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_candidates_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_onboarding_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_marketing_events_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_marketing_leads_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_marketing_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_employee_ce_credits_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_employee_time_off_balances_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_payroll_adjustment_timestamp()');
SELECT pg_temp.safe_alter_search_path('public.update_candidate_documents_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_candidate_notes_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_candidate_interview_timestamp()');
SELECT pg_temp.safe_alter_search_path('public.update_employee_documents_updated_at()');
SELECT pg_temp.safe_alter_search_path('public.update_employee_licenses_updated_at()');

-- Note initials functions
SELECT pg_temp.safe_alter_search_path('public.set_partner_note_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_partner_note_edited_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_marketing_partner_note_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_marketing_partner_note_edited_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_employee_note_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_employee_note_edited_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_candidate_note_initials()');
SELECT pg_temp.safe_alter_search_path('public.set_candidate_note_edited_initials()');

-- Marketing/lead functions
SELECT pg_temp.safe_alter_search_path('public.set_lead_name_from_parts()');

-- Partner/referral functions
SELECT pg_temp.safe_alter_search_path('public.update_partner_last_visit()');
SELECT pg_temp.safe_alter_search_path('public.update_partner_last_contact()');
SELECT pg_temp.safe_alter_search_path('public.get_overdue_partners()');

-- Notification functions
SELECT pg_temp.safe_alter_search_path('public.handle_time_off_notification()');
SELECT pg_temp.safe_alter_search_path('public.notify_time_off_change()');
SELECT pg_temp.safe_alter_search_path('public.notify_shift_published()');
SELECT pg_temp.safe_alter_search_path('public.notify_review_request()');
SELECT pg_temp.safe_alter_search_path('public.notify_admins_on_employee_termination()');
SELECT pg_temp.safe_alter_search_path('public.notify_employee_skill_change()');
SELECT pg_temp.safe_alter_search_path('public.notify_skill_change_with_manager()');
SELECT pg_temp.safe_alter_search_path('public.notify_candidate_forward()');

-- Onboarding functions
SELECT pg_temp.safe_alter_search_path('public.trigger_onboarding_status_notification()');
SELECT pg_temp.safe_alter_search_path('public.trigger_onboarding_stage_complete()');
SELECT pg_temp.safe_alter_search_path('public.start_candidate_onboarding(UUID)');
SELECT pg_temp.safe_alter_search_path('public.promote_candidate_to_employee(UUID)');

-- Attendance functions
SELECT pg_temp.safe_alter_search_path('public.set_attendance_penalty_weight()');
SELECT pg_temp.safe_alter_search_path('public.calculate_reliability_score(UUID)');
SELECT pg_temp.safe_alter_search_path('public.get_attendance_breakdown(UUID, DATE, DATE)');
SELECT pg_temp.safe_alter_search_path('public.get_attendance_by_status(UUID, INTEGER)');
SELECT pg_temp.safe_alter_search_path('public.convert_to_excused(UUID)');
SELECT pg_temp.safe_alter_search_path('public.sync_attendance_from_shift()');
SELECT pg_temp.safe_alter_search_path('public.sync_attendance_from_shift(UUID)');
SELECT pg_temp.safe_alter_search_path('public.trigger_sync_attendance_on_shift_complete()');
SELECT pg_temp.safe_alter_search_path('public.trigger_sync_attendance_on_time_entry()');
SELECT pg_temp.safe_alter_search_path('public.auto_complete_past_shifts()');

-- Skill & training functions
SELECT pg_temp.safe_alter_search_path('public.apply_course_skill_advancement()');
SELECT pg_temp.safe_alter_search_path('public.get_skill_training_courses(UUID)');

-- Payroll functions
SELECT pg_temp.safe_alter_search_path('public.calculate_overtime_breakdown(UUID, DATE, DATE)');
SELECT pg_temp.safe_alter_search_path('public.get_payroll_summary(DATE, DATE)');
SELECT pg_temp.safe_alter_search_path('public.get_employee_timecard(UUID, DATE, DATE)');

-- CE functions
SELECT pg_temp.safe_alter_search_path('public.generate_ce_event_checklist(UUID)');
SELECT pg_temp.safe_alter_search_path('public.trigger_generate_ce_checklist()');
SELECT pg_temp.safe_alter_search_path('public.trigger_ce_task_completed_notification()');

-- Utility functions
SELECT pg_temp.safe_alter_search_path('public.extract_resume_text(TEXT)');
SELECT pg_temp.safe_alter_search_path('public.increment_version()');

-- Auth trigger function
SELECT pg_temp.safe_alter_search_path('public.handle_new_user()');

-- Drop the helper function (pg_temp functions are auto-dropped at session end anyway)
DROP FUNCTION IF EXISTS pg_temp.safe_alter_search_path(TEXT);
