-- =====================================================
-- Migration 180: Fix Marketing Admin RLS Permissions
-- =====================================================
-- Description:
--   Updates RLS policies for marketing tables to allow marketing_admin role
--   to create, edit, and delete marketing content including events, leads,
--   resources, partners, etc.
--
-- Problem:
--   The marketing table RLS policies used is_admin() which only allows
--   'admin' and 'super_admin' roles, excluding 'marketing_admin' and 'manager'
--
-- Solution:
--   Update all marketing-related table policies to use is_marketing_admin()
--   which includes: admin, super_admin, marketing_admin, manager
-- =====================================================

-- =====================================================
-- 1. ENSURE is_marketing_admin() FUNCTION EXISTS AND IS CURRENT
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'marketing_admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO anon;

-- =====================================================
-- 2. FIX MARKETING_EVENTS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "marketing_events_admin_all" ON public.marketing_events;
DROP POLICY IF EXISTS "marketing_events_view" ON public.marketing_events;
DROP POLICY IF EXISTS "anon_select_events" ON public.marketing_events;

-- Marketing admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "marketing_events_marketing_admin_all"
ON public.marketing_events
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view events
CREATE POLICY "marketing_events_authenticated_view"
ON public.marketing_events
FOR SELECT
TO authenticated
USING (true);

-- Anonymous can view events (for lead capture pages)
CREATE POLICY "marketing_events_anon_view"
ON public.marketing_events
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- 3. FIX MARKETING_LEADS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "marketing_leads_admin_all" ON public.marketing_leads;
DROP POLICY IF EXISTS "marketing_leads_view" ON public.marketing_leads;
DROP POLICY IF EXISTS "marketing_leads_public_insert" ON public.marketing_leads;

-- Marketing admins can do everything
CREATE POLICY "marketing_leads_marketing_admin_all"
ON public.marketing_leads
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view leads
CREATE POLICY "marketing_leads_authenticated_view"
ON public.marketing_leads
FOR SELECT
TO authenticated
USING (true);

-- Public (unauthenticated) can insert leads via lead capture forms
CREATE POLICY "marketing_leads_anon_insert"
ON public.marketing_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- 4. FIX MARKETING_RESOURCES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "marketing_resources_admin_all" ON public.marketing_resources;
DROP POLICY IF EXISTS "marketing_resources_view" ON public.marketing_resources;

-- Marketing admins can do everything
CREATE POLICY "marketing_resources_marketing_admin_all"
ON public.marketing_resources
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view resources
CREATE POLICY "marketing_resources_authenticated_view"
ON public.marketing_resources
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 5. FIX REFERRAL_PARTNERS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "referral_partners_admin_all" ON public.referral_partners;
DROP POLICY IF EXISTS "referral_partners_view" ON public.referral_partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON public.referral_partners;
DROP POLICY IF EXISTS "All authenticated can view partners" ON public.referral_partners;

-- Marketing admins can do everything
CREATE POLICY "referral_partners_marketing_admin_all"
ON public.referral_partners
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view partners
CREATE POLICY "referral_partners_authenticated_view"
ON public.referral_partners
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 6. FIX PARTNER_EVENTS RLS POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_events') THEN
    DROP POLICY IF EXISTS "partner_events_admin_all" ON public.partner_events;
    DROP POLICY IF EXISTS "partner_events_view" ON public.partner_events;
    
    EXECUTE 'CREATE POLICY "partner_events_marketing_admin_all" ON public.partner_events FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "partner_events_authenticated_view" ON public.partner_events FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- 7. FIX MARKETING_INVENTORY RLS POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_inventory') THEN
    DROP POLICY IF EXISTS "marketing_inventory_admin_all" ON public.marketing_inventory;
    DROP POLICY IF EXISTS "marketing_inventory_view" ON public.marketing_inventory;
    DROP POLICY IF EXISTS "Admins can manage inventory" ON public.marketing_inventory;
    DROP POLICY IF EXISTS "All authenticated can view inventory" ON public.marketing_inventory;
    
    EXECUTE 'CREATE POLICY "marketing_inventory_marketing_admin_all" ON public.marketing_inventory FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_inventory_authenticated_view" ON public.marketing_inventory FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- 8. FIX MARKETING_CAMPAIGNS RLS POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_campaigns') THEN
    DROP POLICY IF EXISTS "marketing_campaigns_admin_all" ON public.marketing_campaigns;
    DROP POLICY IF EXISTS "marketing_campaigns_view" ON public.marketing_campaigns;
    
    EXECUTE 'CREATE POLICY "marketing_campaigns_marketing_admin_all" ON public.marketing_campaigns FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_campaigns_authenticated_view" ON public.marketing_campaigns FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- 9. FIX EDUCATION/GDU TABLES RLS POLICIES
-- =====================================================

-- Create is_gdu_admin function for education access
CREATE OR REPLACE FUNCTION public.is_gdu_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'marketing_admin', 'manager', 'hr_admin', 'sup_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_gdu_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gdu_admin() TO anon;

-- Fix education_visitors (GDU Visitors) if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_visitors') THEN
    DROP POLICY IF EXISTS "education_visitors_admin_all" ON public.education_visitors;
    DROP POLICY IF EXISTS "education_visitors_view" ON public.education_visitors;
    DROP POLICY IF EXISTS "All authenticated can view visitors" ON public.education_visitors;
    DROP POLICY IF EXISTS "Admins can manage visitors" ON public.education_visitors;
    
    EXECUTE 'CREATE POLICY "education_visitors_gdu_admin_all" ON public.education_visitors FOR ALL TO authenticated USING (public.is_gdu_admin()) WITH CHECK (public.is_gdu_admin())';
    EXECUTE 'CREATE POLICY "education_visitors_authenticated_view" ON public.education_visitors FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Fix ce_events (CE Events) if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ce_events') THEN
    DROP POLICY IF EXISTS "ce_events_admin_all" ON public.ce_events;
    DROP POLICY IF EXISTS "ce_events_view" ON public.ce_events;
    DROP POLICY IF EXISTS "All authenticated can view ce_events" ON public.ce_events;
    DROP POLICY IF EXISTS "Admins can manage ce_events" ON public.ce_events;
    
    EXECUTE 'CREATE POLICY "ce_events_gdu_admin_all" ON public.ce_events FOR ALL TO authenticated USING (public.is_gdu_admin()) WITH CHECK (public.is_gdu_admin())';
    EXECUTE 'CREATE POLICY "ce_events_authenticated_view" ON public.ce_events FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Fix education_students if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_students') THEN
    DROP POLICY IF EXISTS "education_students_admin_all" ON public.education_students;
    DROP POLICY IF EXISTS "education_students_view" ON public.education_students;
    
    EXECUTE 'CREATE POLICY "education_students_gdu_admin_all" ON public.education_students FOR ALL TO authenticated USING (public.is_gdu_admin()) WITH CHECK (public.is_gdu_admin())';
    EXECUTE 'CREATE POLICY "education_students_authenticated_view" ON public.education_students FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- COMPLETE
-- =====================================================
-- Jennifer Vasquez (marketing_admin) should now have full access to:
-- - Marketing Events (create, edit, delete)
-- - Marketing Leads (create, edit, delete)
-- - Marketing Resources (create, edit, delete)
-- - Referral Partners (create, edit, delete)
-- - Partner Events (create, edit, delete)
-- - Marketing Inventory (create, edit, delete)
-- - Marketing Campaigns (create, edit, delete)
-- - GDU/Education content (create, edit, delete)
-- =====================================================
