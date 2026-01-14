-- =====================================================
-- Migration 122: Fix Company Settings RLS and Storage
-- =====================================================
-- Resolves 406 errors when updating company settings/logo

-- =====================================================
-- 1. Ensure company_settings table has proper RLS
-- =====================================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_view" ON public.company_settings;
DROP POLICY IF EXISTS "Admins manage company settings" ON public.company_settings;
DROP POLICY IF EXISTS "All authenticated can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
DROP POLICY IF EXISTS "All authenticated can view company" ON public.company_settings;

-- Create clean policies
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
    AND p.role = 'admin'
  )
);

CREATE POLICY "company_settings_update"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
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
    AND p.role = 'admin'
  )
);

-- =====================================================
-- 2. Ensure company-assets storage bucket exists
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

-- =====================================================
-- 3. Fix storage policies for company-assets
-- =====================================================
DROP POLICY IF EXISTS "Allow authenticated uploads to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from company-assets" ON storage.objects;

-- Admin-only uploads
CREATE POLICY "Admin uploads to company-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Public read (for logo display)
CREATE POLICY "Public read company-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Admin update
CREATE POLICY "Admin update company-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Admin delete
CREATE POLICY "Admin delete company-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- =====================================================
-- 4. Ensure grants are in place
-- =====================================================
GRANT ALL ON public.company_settings TO authenticated;
GRANT SELECT ON public.company_settings TO anon;

-- =====================================================
-- 5. Create company_settings row if none exists
-- =====================================================
INSERT INTO public.company_settings (display_name, legal_name, timezone)
SELECT 'Green Dog Dental', 'Green Dog Dental, Inc.', 'America/Los_Angeles'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);
