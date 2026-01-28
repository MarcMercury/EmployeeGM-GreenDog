-- =====================================================
-- Migration 183: Fix Broken Marketing RLS Policies
-- =====================================================
-- Problem: Multiple marketing policies have bugs:
-- 1. Using p.id = auth.uid() instead of p.auth_user_id = auth.uid()
-- 2. Only checking for 'admin' role, not marketing_admin
-- 3. Conflicting policies (old and new both exist)
-- 
-- This migration removes the broken old policies and keeps only
-- the correct *_marketing_admin_all policies that use is_marketing_admin()
-- =====================================================

-- =====================================================
-- SECTION 1: Drop all the broken/conflicting policies
-- =====================================================

-- marketing_campaigns - has broken "Admins can manage" policy
DROP POLICY IF EXISTS "Admins can manage marketing campaigns" ON public.marketing_campaigns;

-- marketing_influencers - has broken p.id = auth.uid() check
DROP POLICY IF EXISTS "Admins can manage marketing influencers" ON public.marketing_influencers;
DROP POLICY IF EXISTS "All authenticated can view influencers" ON public.marketing_influencers;
DROP POLICY IF EXISTS "Admins can manage influencers" ON public.marketing_influencers;

-- marketing_inventory - has broken p.id = auth.uid() check
DROP POLICY IF EXISTS "Admins can manage marketing inventory" ON public.marketing_inventory;

-- marketing_spending - has broken p.id = auth.uid() check
DROP POLICY IF EXISTS "Admins can manage marketing spending" ON public.marketing_spending;

-- marketing_resources - only allows 'admin', not marketing_admin
DROP POLICY IF EXISTS "Admins can manage marketing_resources" ON public.marketing_resources;

-- marketing_supplies - has broken p.id = auth.uid() check
DROP POLICY IF EXISTS "Admin/HR can manage marketing supplies" ON public.marketing_supplies;

-- marketing_partners - old broken policies
DROP POLICY IF EXISTS "Marketing partners role access" ON public.marketing_partners;
DROP POLICY IF EXISTS "Admins can manage marketing partners" ON public.marketing_partners;
DROP POLICY IF EXISTS "All authenticated can view marketing partners" ON public.marketing_partners;

-- marketing_leads - has multiple broken policies with p.id = auth.uid()
DROP POLICY IF EXISTS "Marketing leads role access" ON public.marketing_leads;
DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
DROP POLICY IF EXISTS "admin_delete_marketing_leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "admin_update_marketing_leads" ON public.marketing_leads;

-- =====================================================
-- SECTION 2: Ensure correct policies exist (they should from migration 182)
-- These are idempotent - will do nothing if they already exist
-- =====================================================

-- marketing_supplies (was missing from previous migrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_supplies') THEN
    DROP POLICY IF EXISTS "marketing_supplies_marketing_admin_all" ON public.marketing_supplies;
    DROP POLICY IF EXISTS "marketing_supplies_authenticated_view" ON public.marketing_supplies;
    EXECUTE 'CREATE POLICY "marketing_supplies_marketing_admin_all" ON public.marketing_supplies FOR ALL TO authenticated USING (public.is_marketing_admin()) WITH CHECK (public.is_marketing_admin())';
    EXECUTE 'CREATE POLICY "marketing_supplies_authenticated_view" ON public.marketing_supplies FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- leads table - ensure correct policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    -- Already has leads_marketing_admin_all and leads_authenticated_view from migration 182
    NULL;
  END IF;
END $$;

-- marketing_leads - add proper delete policy for marketing_admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_leads') THEN
    -- The marketing_leads_marketing_admin_all policy should cover insert/update/delete
    -- But let's make sure delete is explicitly allowed
    DROP POLICY IF EXISTS "marketing_leads_delete" ON public.marketing_leads;
    EXECUTE 'CREATE POLICY "marketing_leads_delete" ON public.marketing_leads FOR DELETE TO authenticated USING (public.is_marketing_admin())';
  END IF;
END $$;

-- =====================================================
-- SECTION 3: Fix the can_access_marketing function if it exists
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_access_marketing()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Use the is_marketing_admin helper for consistency
  RETURN public.is_marketing_admin();
END;
$$;

COMMENT ON FUNCTION public.can_access_marketing() IS 'Legacy function for marketing access, now delegates to is_marketing_admin()';

-- =====================================================
-- SECTION 4: Ensure all users can view their own profile
-- This is critical for the middleware to work!
-- =====================================================

-- Make sure the self-view policy exists and is correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Make sure all authenticated can view profiles (for roster, etc)
DROP POLICY IF EXISTS "profiles_authenticated_view" ON public.profiles;
CREATE POLICY "profiles_authenticated_view" ON public.profiles 
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- COMPLETE: Marketing policies now use is_marketing_admin()
-- =====================================================
