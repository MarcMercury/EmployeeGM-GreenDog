-- =====================================================
-- Migration: Fix Referral CRM access for Marketing Admin
-- =====================================================
-- Problem:
--   referral_sync_history and referral_revenue_line_items tables
--   have RLS policies using is_admin() which only allows super_admin
--   and admin roles. Marketing admins cannot view upload logs,
--   upload history, or create records from unmatched entries.
--
-- Solution:
--   Update policies to use is_marketing_admin() which includes:
--   super_admin, admin, manager, marketing_admin
--   Also add SELECT policies so marketing users can read these tables.
-- =====================================================

-- =====================================================
-- 1. REFERRAL_SYNC_HISTORY – allow marketing_admin full access
-- =====================================================
DROP POLICY IF EXISTS "referral_sync_history_admin_all" ON public.referral_sync_history;
DROP POLICY IF EXISTS "referral_sync_history_marketing_admin_all" ON public.referral_sync_history;
DROP POLICY IF EXISTS "referral_sync_history_authenticated_view" ON public.referral_sync_history;

-- Marketing admins can do everything (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "referral_sync_history_marketing_admin_all"
ON public.referral_sync_history
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view upload history (read-only)
CREATE POLICY "referral_sync_history_authenticated_view"
ON public.referral_sync_history
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 2. REFERRAL_REVENUE_LINE_ITEMS – allow marketing_admin full access
-- =====================================================
DROP POLICY IF EXISTS "revenue_line_items_admin_all" ON public.referral_revenue_line_items;
DROP POLICY IF EXISTS "revenue_line_items_marketing_admin_all" ON public.referral_revenue_line_items;
DROP POLICY IF EXISTS "revenue_line_items_authenticated_view" ON public.referral_revenue_line_items;

-- Marketing admins can do everything
CREATE POLICY "revenue_line_items_marketing_admin_all"
ON public.referral_revenue_line_items
FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- All authenticated users can view line items (for reports)
CREATE POLICY "revenue_line_items_authenticated_view"
ON public.referral_revenue_line_items
FOR SELECT
TO authenticated
USING (true);
