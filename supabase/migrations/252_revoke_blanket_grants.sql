-- Migration: 252_revoke_blanket_grants.sql
-- Date: 2026-02-13
-- Purpose: Revoke dangerously broad schema-level grants that undermine RLS.
--
-- Previously, 002_security.sql granted:
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
--   GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
--
-- This means:
--   - Any authenticated user has INSERT/UPDATE/DELETE on ALL tables (RLS is only barrier)
--   - Any anonymous user has SELECT on ALL tables (RLS is only barrier)
--   - If any table is missing RLS policies, it's fully exposed
--
-- This migration revokes the blanket grants and replaces them with
-- table-specific grants. authenticated users keep SELECT on all public tables
-- (relying on RLS for row filtering) but INSERT/UPDATE/DELETE are only granted
-- on tables that authenticated users legitimately need to write to.
-- The anon role is restricted to only tables that truly need public read access.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Revoke blanket grants
-- ═══════════════════════════════════════════════════════════════════

-- Revoke ALL from authenticated (we'll re-grant selectively)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

-- Revoke SELECT from anon on all tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Grant SELECT to authenticated on all tables (RLS filters rows)
-- ═══════════════════════════════════════════════════════════════════
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Grant INSERT/UPDATE/DELETE only on tables users need to write to
-- ═══════════════════════════════════════════════════════════════════

-- Profiles — users update their own profile
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Employee self-service tables
GRANT INSERT, UPDATE ON public.employees TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.time_off_requests TO authenticated;
GRANT INSERT, UPDATE ON public.time_punches TO authenticated;
GRANT INSERT, UPDATE ON public.employee_skills TO authenticated;
GRANT INSERT, UPDATE ON public.employee_certifications TO authenticated;
GRANT INSERT, UPDATE ON public.employee_documents TO authenticated;
GRANT INSERT ON public.employee_change_log TO authenticated;

-- Academy / Training
GRANT INSERT, UPDATE ON public.training_enrollments TO authenticated;
GRANT INSERT, UPDATE ON public.training_progress TO authenticated;
GRANT INSERT, UPDATE ON public.training_quiz_attempts TO authenticated;
GRANT INSERT, UPDATE ON public.course_progress TO authenticated;
GRANT INSERT, UPDATE ON public.student_programs TO authenticated;

-- Performance
GRANT INSERT, UPDATE ON public.performance_reviews TO authenticated;
GRANT INSERT, UPDATE ON public.performance_goals TO authenticated;
GRANT INSERT, UPDATE ON public.performance_feedback TO authenticated;
GRANT INSERT, UPDATE ON public.review_responses TO authenticated;
GRANT INSERT, UPDATE ON public.review_signoffs TO authenticated;

-- Schedule (managers/admins manage, employees view)
GRANT INSERT, UPDATE, DELETE ON public.schedule_drafts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schedule_shifts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schedule_templates TO authenticated;
GRANT INSERT, UPDATE ON public.shift_swap_requests TO authenticated;
GRANT INSERT, UPDATE ON public.employee_availability TO authenticated;

-- Notifications — users create and manage their own
GRANT INSERT, UPDATE ON public.notifications TO authenticated;

-- Marketing
GRANT INSERT, UPDATE, DELETE ON public.marketing_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketing_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketing_partner_notes TO authenticated;
GRANT INSERT, UPDATE ON public.marketing_leads TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketing_calendar_notes TO authenticated;
GRANT INSERT, UPDATE ON public.event_sign_ups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_inventory TO authenticated;

-- GDU / Education
GRANT INSERT, UPDATE ON public.gdu_courses TO authenticated;
GRANT INSERT, UPDATE ON public.gdu_lessons TO authenticated;
GRANT INSERT, UPDATE ON public.gdu_enrollments TO authenticated;
GRANT INSERT, UPDATE ON public.gdu_progress TO authenticated;

-- Wiki
GRANT INSERT, UPDATE ON public.wiki_articles TO authenticated;

-- Recruiting
GRANT INSERT, UPDATE ON public.candidates TO authenticated;
GRANT INSERT, UPDATE ON public.interviews TO authenticated;
GRANT INSERT, UPDATE ON public.candidate_notes TO authenticated;
GRANT INSERT, UPDATE ON public.job_postings TO authenticated;

-- Marketplace
GRANT INSERT, UPDATE, DELETE ON public.marketplace_gigs TO authenticated;
GRANT INSERT, UPDATE ON public.marketplace_claims TO authenticated;
GRANT INSERT, UPDATE ON public.marketplace_wallets TO authenticated;
GRANT INSERT, UPDATE ON public.marketplace_transactions TO authenticated;

-- Operations
GRANT INSERT, UPDATE ON public.compliance_items TO authenticated;
GRANT INSERT, UPDATE ON public.payroll_runs TO authenticated;
GRANT INSERT, UPDATE ON public.payroll_run_items TO authenticated;

-- Intake/Lifecycle
GRANT INSERT, UPDATE ON public.intake_persons TO authenticated;
GRANT INSERT, UPDATE ON public.intake_forms TO authenticated;

-- Activity
GRANT INSERT ON public.activity_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;

-- Settings (admin writes, users read)
GRANT INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;

-- Referral Partners
GRANT INSERT, UPDATE ON public.referral_partners TO authenticated;
GRANT INSERT, UPDATE ON public.referral_stats TO authenticated;
GRANT INSERT, UPDATE ON public.clinic_visits TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Grant anon SELECT only on truly public tables
-- ═══════════════════════════════════════════════════════════════════

-- Public job listings
GRANT SELECT ON public.job_postings TO anon;

-- Lead capture — anon needs INSERT for public lead forms
GRANT INSERT ON public.marketing_leads TO anon;

-- Public intake forms
GRANT SELECT ON public.intake_forms TO anon;
GRANT INSERT, UPDATE ON public.intake_persons TO anon;

-- Facility resources (public info)
GRANT SELECT ON public.facility_resources TO anon;

-- Positions (for public career page)
GRANT SELECT ON public.positions TO anon;
GRANT SELECT ON public.departments TO anon;
GRANT SELECT ON public.locations TO anon;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Ensure future tables do NOT get automatic grants
-- ═══════════════════════════════════════════════════════════════════
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

COMMIT;
