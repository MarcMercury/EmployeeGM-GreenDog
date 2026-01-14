-- =====================================================
-- FIX: Settings Page 406 Errors
-- =====================================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new
-- =====================================================

-- Step 1: Check current user's admin status (for debugging)
-- Run this first to verify you're logged in as admin:
-- SELECT public.is_admin() as am_i_admin;
-- SELECT * FROM public.profiles WHERE auth_user_id = auth.uid();

-- =====================================================
-- PART A: Fix is_admin function (ensure it exists and works)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- =====================================================
-- PART B: Fix company_settings table RLS
-- =====================================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
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

-- Create simple, clear policies

-- 1. Everyone can READ company settings
CREATE POLICY "company_settings_read_all"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- 2. Only admins can INSERT
CREATE POLICY "company_settings_insert_admin"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- 3. Only admins can UPDATE
CREATE POLICY "company_settings_update_admin"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- 4. Only admins can DELETE
CREATE POLICY "company_settings_delete_admin"
ON public.company_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- PART C: Fix storage bucket for company assets
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

-- Drop all existing storage policies for company-assets
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

-- Create new storage policies for company-assets

-- Public read (logos should be publicly visible)
CREATE POLICY "company_assets_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Admin upload
CREATE POLICY "company_assets_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Admin update
CREATE POLICY "company_assets_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Admin delete
CREATE POLICY "company_assets_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- PART D: Ensure company_settings has a row
-- =====================================================
INSERT INTO public.company_settings (display_name, legal_name, timezone)
SELECT 'Green Dog Dental', 'Green Dog Dental, Inc.', 'America/Los_Angeles'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- =====================================================
-- PART E: Ensure logo_url column exists
-- =====================================================
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =====================================================
-- PART F: Grant permissions
-- =====================================================
GRANT ALL ON public.company_settings TO authenticated;
GRANT SELECT ON public.company_settings TO anon;

-- =====================================================
-- VERIFICATION QUERIES (run these after to check)
-- =====================================================
-- Check policies on company_settings:
-- SELECT * FROM pg_policies WHERE tablename = 'company_settings';

-- Check if you can update:
-- UPDATE public.company_settings SET updated_at = NOW() WHERE id = (SELECT id FROM company_settings LIMIT 1);

-- Check storage policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname ILIKE '%company%';
