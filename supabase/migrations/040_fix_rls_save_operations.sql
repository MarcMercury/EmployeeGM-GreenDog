-- =====================================================
-- MIGRATION 040: Fix RLS Policies for Save Operations
-- Addresses: Event save failures, Lead save failures, 
--            Resource save failures, Logo upload issues
-- =====================================================

-- =====================================================
-- 1. MARKETING EVENTS - Ensure INSERT works
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage marketing events" ON public.marketing_events;
DROP POLICY IF EXISTS "All authenticated can view events" ON public.marketing_events;

-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "marketing_events_admin_all"
ON public.marketing_events
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can view events
CREATE POLICY "marketing_events_view"
ON public.marketing_events
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 2. MARKETING LEADS - Ensure INSERT works
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage marketing leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "Public can insert leads" ON public.marketing_leads;

-- Admins can do everything
CREATE POLICY "marketing_leads_admin_all"
ON public.marketing_leads
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can view leads
CREATE POLICY "marketing_leads_view"
ON public.marketing_leads
FOR SELECT
TO authenticated
USING (true);

-- Public (unauthenticated) can insert leads via lead capture forms
CREATE POLICY "marketing_leads_public_insert"
ON public.marketing_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- 3. MARKETING RESOURCES - Ensure CRUD works
-- =====================================================
DROP POLICY IF EXISTS "All authenticated can view resources" ON public.marketing_resources;
DROP POLICY IF EXISTS "Admins can manage resources" ON public.marketing_resources;

-- Admins can do everything
CREATE POLICY "marketing_resources_admin_all"
ON public.marketing_resources
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can view resources
CREATE POLICY "marketing_resources_view"
ON public.marketing_resources
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 4. COMPANY SETTINGS - Allow admins to update
-- =====================================================
DROP POLICY IF EXISTS "Admins manage company settings" ON public.company_settings;
DROP POLICY IF EXISTS "All authenticated can view company" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_view" ON public.company_settings;

-- Ensure RLS is enabled
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "company_settings_admin_all"
ON public.company_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated can view company settings
CREATE POLICY "company_settings_view"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 5. Verify/Fix is_admin function
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query with explicit table reference
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Check for admin role
  RETURN COALESCE(user_role = 'admin', FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure function is accessible
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- =====================================================
-- 6. STORAGE: company-assets bucket for logo uploads
-- =====================================================
-- Note: Storage policies are managed separately via Supabase Dashboard
-- or supabase/storage.sql if using local development

-- Create bucket if not exists (run in SQL editor if needed):
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('company-assets', 'company-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. GRANTS - Ensure tables are accessible
-- =====================================================
GRANT ALL ON public.marketing_events TO authenticated;
GRANT ALL ON public.marketing_leads TO authenticated;
GRANT ALL ON public.marketing_resources TO authenticated;
GRANT ALL ON public.company_settings TO authenticated;

GRANT SELECT ON public.marketing_events TO anon;
GRANT INSERT ON public.marketing_leads TO anon;
GRANT SELECT ON public.marketing_resources TO anon;
GRANT SELECT ON public.company_settings TO anon;
