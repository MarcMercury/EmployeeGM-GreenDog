-- Migration 280: Fix Security Definer Views + RLS Issues
-- Resolves all Supabase linter security errors:
--   1. 22 views with SECURITY DEFINER -> SECURITY INVOKER (via ALTER VIEW)
--   2. audit_log_archive missing RLS
--   3. facility_resources RLS policy referencing user_metadata

BEGIN;

-- =====================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Use ALTER VIEW SET (security_invoker = true) to preserve
-- existing view definitions without risk of schema drift.
-- =====================================================

ALTER VIEW public.master_profile_view SET (security_invoker = true);
ALTER VIEW public.unified_persons_view SET (security_invoker = true);
ALTER VIEW public.employee_change_log_view SET (security_invoker = true);
ALTER VIEW public.access_matrix_view SET (security_invoker = true);
ALTER VIEW public.access_matrix_summary SET (security_invoker = true);
ALTER VIEW public.pending_course_signoffs SET (security_invoker = true);
ALTER VIEW public.student_program_view SET (security_invoker = true);
ALTER VIEW public.service_coverage_summary SET (security_invoker = true);
ALTER VIEW public.scheduling_context SET (security_invoker = true);
ALTER VIEW public.shift_builder_details SET (security_invoker = true);
ALTER VIEW public.pending_user_accounts SET (security_invoker = true);
ALTER VIEW public.contact_notes_view SET (security_invoker = true);
ALTER VIEW public.ezyvet_revenue_by_city SET (security_invoker = true);
ALTER VIEW public.ezyvet_revenue_by_referral SET (security_invoker = true);
ALTER VIEW public.ezyvet_division_summary SET (security_invoker = true);
ALTER VIEW public.ezyvet_revenue_by_breed SET (security_invoker = true);
ALTER VIEW public.ezyvet_revenue_by_department SET (security_invoker = true);
ALTER VIEW public.invoice_monthly_summary SET (security_invoker = true);
ALTER VIEW public.invoice_staff_summary SET (security_invoker = true);
ALTER VIEW public.appointment_weekly_summary SET (security_invoker = true);
ALTER VIEW public.expiring_credentials SET (security_invoker = true);
ALTER VIEW public.v_partners_with_distances SET (security_invoker = true);

-- =====================================================
-- 2. FIX RLS ON audit_log_archive
-- Enable RLS and ensure policies exist
-- =====================================================

ALTER TABLE public.audit_log_archive ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "audit_log_archive_select_policy" ON public.audit_log_archive;
DROP POLICY IF EXISTS "audit_log_archive_insert_policy" ON public.audit_log_archive;
DROP POLICY IF EXISTS "audit_log_archive_delete_policy" ON public.audit_log_archive;

CREATE POLICY "audit_log_archive_select_policy" ON public.audit_log_archive
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

CREATE POLICY "audit_log_archive_insert_policy" ON public.audit_log_archive
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

CREATE POLICY "audit_log_archive_delete_policy" ON public.audit_log_archive
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'sup_admin')
    )
  );

-- =====================================================
-- 3. FIX facility_resources RLS POLICY
-- Replace user_metadata reference with profiles table lookup
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view facility resources"
  ON public.facility_resources;

CREATE POLICY "Authenticated users can view facility resources"
  ON public.facility_resources
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_active = true
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('manager', 'sup_admin', 'office_admin')
      )
    )
  );

COMMIT;
