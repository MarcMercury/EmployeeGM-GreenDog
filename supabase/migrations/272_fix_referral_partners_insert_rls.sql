-- =====================================================
-- Migration 272: Fix Referral Partners INSERT RLS for Marketing Admin
-- =====================================================
-- Problem: Marketing admin users cannot add new clinics to the CRM.
--   The INSERT operation fails due to missing or incorrect RLS policy.
--   Existing policies might lack WITH CHECK clauses for INSERT/UPDATE.
--
-- Solution: Drop all existing policies and recreate with explicit
--   WITH CHECK clauses for INSERT/UPDATE/DELETE operations.
-- =====================================================

-- =====================================================
-- STEP 1: Drop all existing policies on referral_partners
-- =====================================================
DROP POLICY IF EXISTS "referral_partners_marketing_admin_all" ON public.referral_partners;
DROP POLICY IF EXISTS "referral_partners_authenticated_view" ON public.referral_partners;
DROP POLICY IF EXISTS "referral_partners_admin_all" ON public.referral_partners;
DROP POLICY IF EXISTS "referral_partners_view" ON public.referral_partners;
DROP POLICY IF EXISTS "Admins can manage referral partners" ON public.referral_partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON public.referral_partners;
DROP POLICY IF EXISTS "All authenticated can view partners" ON public.referral_partners;
DROP POLICY IF EXISTS "Admin full access to referral_partners" ON public.referral_partners;

-- =====================================================
-- STEP 2: Ensure RLS is enabled
-- =====================================================
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create policies for marketing_admin full access
-- =====================================================

-- Policy for SELECT: Anyone authenticated can READ partners
CREATE POLICY "referral_partners_select"
ON public.referral_partners
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT: marketing_admin can INSERT new partners
CREATE POLICY "referral_partners_insert"
ON public.referral_partners
FOR INSERT
TO authenticated
WITH CHECK (public.is_marketing_admin());

-- Policy for UPDATE: marketing_admin can UPDATE existing partners
CREATE POLICY "referral_partners_update"
ON public.referral_partners
FOR UPDATE
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- Policy for DELETE: marketing_admin can DELETE partners
CREATE POLICY "referral_partners_delete"
ON public.referral_partners
FOR DELETE
TO authenticated
USING (public.is_marketing_admin());

-- =====================================================
-- STEP 4: Grant necessary permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_partners TO authenticated;

-- =====================================================
-- STEP 5: Verify is_marketing_admin() function exists and is correct
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO anon;

-- =====================================================
-- COMPLETE: Marketing admin users can now add/edit/delete partners
-- =====================================================
