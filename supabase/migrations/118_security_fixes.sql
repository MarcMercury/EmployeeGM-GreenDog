-- Migration: 118_security_fixes.sql
-- Purpose: Security hardening - fix views, functions, and RLS policies
-- Note: This is a simplified version that only creates policies for existing tables
-- Date: 2026-01-14

-- =====================================================
-- 1. FIX SECURITY DEFINER VIEWS (convert to regular views)
-- =====================================================

DROP VIEW IF EXISTS public.unified_persons_view;
CREATE OR REPLACE VIEW public.unified_persons_view AS
SELECT 
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.phone_mobile,
  up.current_stage,
  up.created_at,
  up.updated_at
FROM public.unified_persons up;

GRANT SELECT ON public.unified_persons_view TO authenticated;

-- =====================================================
-- 2. FIX FUNCTIONS WITH SECURITY DEFINER
-- Add SET search_path = public for security
-- =====================================================

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Fix get_user_initials
DROP FUNCTION IF EXISTS public.get_user_initials(uuid);
CREATE OR REPLACE FUNCTION public.get_user_initials(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initials text;
BEGIN
  SELECT 
    UPPER(LEFT(COALESCE(first_name, email), 1) || LEFT(COALESCE(last_name, ''), 1))
  INTO v_initials
  FROM profiles
  WHERE id = p_profile_id;
  
  RETURN COALESCE(v_initials, '??');
END;
$$;

-- =====================================================
-- 3. FIX SKILL_LIBRARY RLS POLICIES
-- Uses auth_user_id pattern (not profiles.id = auth.uid())
-- =====================================================

ALTER TABLE public.skill_library ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "skill_library_select" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_insert" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_update" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_delete" ON public.skill_library;
DROP POLICY IF EXISTS "Authenticated users can view skills" ON public.skill_library;
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skill_library;

-- Everyone can read skills
CREATE POLICY "skill_library_select"
ON public.skill_library FOR SELECT
TO authenticated
USING (true);

-- Only admins can create skills
CREATE POLICY "skill_library_admin_insert"
ON public.skill_library FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Only admins can update skills
CREATE POLICY "skill_library_admin_update"
ON public.skill_library FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Only admins can delete skills
CREATE POLICY "skill_library_admin_delete"
ON public.skill_library FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- =====================================================
-- 4. FIX COMPANY_SETTINGS RLS POLICIES
-- =====================================================

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies dynamically
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'company_settings' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_settings', pol.policyname);
  END LOOP;
END $$;

-- Create clean policies
CREATE POLICY "company_settings_select"
ON public.company_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "company_settings_insert"
ON public.company_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "company_settings_update"
ON public.company_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "company_settings_delete"
ON public.company_settings FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- =====================================================
-- 5. FIX STORAGE POLICIES FOR COMPANY-ASSETS
-- =====================================================

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

-- Drop old storage policies
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname ILIKE '%company%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create storage policies
CREATE POLICY "company_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "company_assets_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "company_assets_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.company_settings TO authenticated;
GRANT SELECT ON public.company_settings TO anon;
GRANT ALL ON public.skill_library TO authenticated;

-- =====================================================
-- 7. ADD logo_url TO COMPANY_SETTINGS IF MISSING
-- =====================================================
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =====================================================
-- DONE!
-- This migration fixes the most critical security issues:
-- - SECURITY DEFINER views converted to regular views
-- - Functions use SET search_path for security
-- - skill_library has proper RLS (using auth_user_id pattern)
-- - company_settings has proper RLS
-- - company-assets storage has proper policies
-- =====================================================
