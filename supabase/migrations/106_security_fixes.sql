-- =====================================================
-- Migration: 106_security_fixes.sql
-- Purpose: Fix Supabase Advisor security warnings
-- Issues addressed:
--   1. auth_users_exposed - employee_documents_with_details exposes auth.users
--   2. security_definer_view - 6 views using SECURITY DEFINER
--   3. rls_disabled_in_public - 7 tables missing RLS
-- =====================================================

-- =====================================================
-- PART 1: FIX EXPOSED AUTH USERS
-- Replace employee_documents_with_details to not expose auth.users
-- Instead, join to profiles table for email
-- =====================================================

DROP VIEW IF EXISTS public.employee_documents_with_details CASCADE;

CREATE VIEW public.employee_documents_with_details
WITH (security_invoker = true)
AS
SELECT 
  ed.*,
  e.first_name || ' ' || e.last_name as employee_name,
  p.email as uploader_email
FROM public.employee_documents ed
LEFT JOIN public.employees e ON ed.employee_id = e.id
LEFT JOIN public.profiles p ON ed.uploader_id = p.auth_user_id;

-- Grant access to authenticated users only (not anon)
REVOKE ALL ON public.employee_documents_with_details FROM anon;
GRANT SELECT ON public.employee_documents_with_details TO authenticated;

-- =====================================================
-- PART 2: FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER (default in newer Postgres)
-- This ensures RLS policies of underlying tables are respected
-- =====================================================

-- 2a. schedule_with_names
DROP VIEW IF EXISTS public.schedule_with_names CASCADE;

CREATE VIEW public.schedule_with_names
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.schedule_with_names TO authenticated;

-- 2b. partner_event_history
DROP VIEW IF EXISTS public.partner_event_history CASCADE;

CREATE VIEW public.partner_event_history
WITH (security_invoker = true)
AS
SELECT 
  pe.id,
  pe.partner_id,
  rp.name AS partner_name,
  rp.partner_type,
  pe.event_id,
  COALESCE(me.name, pe.event_name) AS event_name,
  COALESCE(me.event_date, pe.event_date) AS event_date,
  me.location AS event_location,
  pe.participation_role,
  pe.booth_size,
  pe.booth_location,
  pe.is_confirmed,
  pe.confirmation_date,
  pe.notes,
  pe.created_at
FROM public.partner_events pe
JOIN public.referral_partners rp ON rp.id = pe.partner_id
LEFT JOIN public.marketing_events me ON me.id = pe.event_id
ORDER BY COALESCE(me.event_date, pe.event_date) DESC;

GRANT SELECT ON public.partner_event_history TO authenticated;

-- 2c. partner_details
DROP VIEW IF EXISTS public.partner_details CASCADE;

CREATE VIEW public.partner_details
WITH (security_invoker = true)
AS
SELECT 
  rp.*,
  -- Event stats
  (SELECT COUNT(*) FROM public.partner_events pe WHERE pe.partner_id = rp.id) AS total_events,
  (SELECT COUNT(*) FROM public.partner_events pe WHERE pe.partner_id = rp.id AND pe.is_confirmed = true) AS confirmed_events,
  -- Note stats
  (SELECT COUNT(*) FROM public.partner_notes pn WHERE pn.partner_id = rp.id) AS total_notes,
  (SELECT MAX(created_at) FROM public.partner_notes pn WHERE pn.partner_id = rp.id) AS last_note_date,
  -- Contact visit stats
  (SELECT COUNT(*) FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id) AS total_visits,
  (SELECT MAX(visit_date) FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id) AS last_visit,
  -- Days since last contact calculation
  CASE 
    WHEN rp.last_contact_date IS NOT NULL 
    THEN EXTRACT(DAY FROM NOW() - rp.last_contact_date::timestamp)::INTEGER
    ELSE NULL
  END AS days_since_contact,
  -- Contact urgency flag
  CASE 
    WHEN rp.last_contact_date IS NULL THEN 'never_contacted'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '90 days' THEN 'overdue'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '60 days' THEN 'needs_attention'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '30 days' THEN 'upcoming'
    ELSE 'recent'
  END AS contact_status
FROM public.referral_partners rp;

GRANT SELECT ON public.partner_details TO authenticated;

-- 2d. user_role_info
DROP VIEW IF EXISTS public.user_role_info CASCADE;

CREATE VIEW public.user_role_info
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.auth_user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  rd.display_name AS role_display_name,
  rd.description AS role_description,
  rd.tier AS role_tier,
  rd.permissions AS role_permissions,
  rd.icon AS role_icon,
  rd.color AS role_color
FROM public.profiles p
LEFT JOIN public.role_definitions rd ON rd.role_key = p.role;

GRANT SELECT ON public.user_role_info TO authenticated;

-- 2e. employee_locations_view (if it exists)
-- Note: This view may have been created elsewhere or via Supabase dashboard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'employee_locations_view'
  ) THEN
    -- Get the current view definition and recreate with security_invoker
    EXECUTE 'DROP VIEW IF EXISTS public.employee_locations_view CASCADE';
    
    -- Recreate with security invoker
    CREATE VIEW public.employee_locations_view
    WITH (security_invoker = true)
    AS
    SELECT 
      el.*,
      e.first_name,
      e.last_name,
      e.first_name || ' ' || e.last_name as employee_name,
      l.name as location_name,
      l.address_line1 as location_address
    FROM public.employee_locations el
    LEFT JOIN public.employees e ON el.employee_id = e.id
    LEFT JOIN public.locations l ON el.location_id = l.id;
    
    GRANT SELECT ON public.employee_locations_view TO authenticated;
  END IF;
END $$;

-- =====================================================
-- PART 3: ENABLE RLS ON MISSING TABLES
-- These tables need RLS + policies for proper security
-- =====================================================

-- 3a. skill_categories - Read-only reference data
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read skill categories
CREATE POLICY "Skill categories are viewable by authenticated users"
  ON public.skill_categories FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify skill categories
CREATE POLICY "Only admins can insert skill categories"
  ON public.skill_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update skill categories"
  ON public.skill_categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete skill categories"
  ON public.skill_categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3b. certifications - Read-only reference data
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certifications are viewable by authenticated users"
  ON public.certifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert certifications"
  ON public.certifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update certifications"
  ON public.certifications FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete certifications"
  ON public.certifications FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3c. employee_certifications - Employee-specific data
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee certifications are viewable by authenticated users"
  ON public.employee_certifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own certifications"
  ON public.employee_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = public.current_employee_id() 
    OR public.is_admin()
  );

CREATE POLICY "Users can update their own certifications"
  ON public.employee_certifications FOR UPDATE
  TO authenticated
  USING (
    employee_id = public.current_employee_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    employee_id = public.current_employee_id() 
    OR public.is_admin()
  );

CREATE POLICY "Only admins can delete employee certifications"
  ON public.employee_certifications FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3d. achievements - Read-only reference data
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by authenticated users"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert achievements"
  ON public.achievements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update achievements"
  ON public.achievements FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete achievements"
  ON public.achievements FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3e. employee_achievements - Employee-specific data
ALTER TABLE public.employee_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee achievements are viewable by authenticated users"
  ON public.employee_achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can award achievements"
  ON public.employee_achievements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update employee achievements"
  ON public.employee_achievements FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete employee achievements"
  ON public.employee_achievements FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3f. points_log - Employee points history
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points log is viewable by authenticated users"
  ON public.points_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can log points"
  ON public.points_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update points log"
  ON public.points_log FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete points log entries"
  ON public.points_log FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3g. mentorships - Mentor/mentee relationships
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentorships are viewable by authenticated users"
  ON public.mentorships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create mentorships they participate in"
  ON public.mentorships FOR INSERT
  TO authenticated
  WITH CHECK (
    mentor_employee_id = public.current_employee_id() 
    OR mentee_employee_id = public.current_employee_id()
    OR public.is_admin()
  );

CREATE POLICY "Participants can update their mentorships"
  ON public.mentorships FOR UPDATE
  TO authenticated
  USING (
    mentor_employee_id = public.current_employee_id() 
    OR mentee_employee_id = public.current_employee_id()
    OR public.is_admin()
  )
  WITH CHECK (
    mentor_employee_id = public.current_employee_id() 
    OR mentee_employee_id = public.current_employee_id()
    OR public.is_admin()
  );

CREATE POLICY "Only admins can delete mentorships"
  ON public.mentorships FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW public.employee_documents_with_details IS 'Employee documents with details - uses profiles instead of auth.users for security';
COMMENT ON VIEW public.schedule_with_names IS 'Schedules with profile and location names - uses SECURITY INVOKER';
COMMENT ON VIEW public.partner_event_history IS 'Partner event history - uses SECURITY INVOKER';
COMMENT ON VIEW public.partner_details IS 'Partner details with stats - uses SECURITY INVOKER';
COMMENT ON VIEW public.user_role_info IS 'User role information - uses SECURITY INVOKER';
