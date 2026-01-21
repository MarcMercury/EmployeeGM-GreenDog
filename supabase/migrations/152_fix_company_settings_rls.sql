-- =====================================================
-- Migration: 152_fix_company_settings_rls.sql
-- Description: Fix RLS to allow super_admin and admin roles
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "company_settings_select" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_delete" ON public.company_settings;

-- Recreate with proper role checks (admin OR super_admin)
CREATE POLICY "company_settings_select"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "company_settings_insert"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "company_settings_update"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "company_settings_delete"
ON public.company_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;

DO $$ BEGIN RAISE NOTICE '✅ Fixed company_settings RLS for admin and super_admin'; END $$;
