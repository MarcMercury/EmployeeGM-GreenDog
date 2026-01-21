-- =====================================================
-- Migration: 148_seed_company_settings.sql
-- Description: Add missing columns and seed company settings
-- =====================================================

-- 1. First ensure the columns exist
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Add description column to departments if missing
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Seed initial company settings if empty
INSERT INTO public.company_settings (company_name, display_name, legal_name, website, contact_email, phone, address)
SELECT 
  'Green Dog Dental Veterinary Center',
  'Green Dog Dental',
  'Green Dog Dental Veterinary Center LLC',
  'www.greendogdental.com',
  'info@greendogdental.com',
  '(818) 282-6663',
  '14661 Aetna St, Van Nuys, CA 91411'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_settings LIMIT 1
);

-- Create storage bucket for company assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for company-assets bucket
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
CREATE POLICY "Anyone can view company assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Admins can delete company assets" ON storage.objects;
CREATE POLICY "Admins can delete company assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

DO $$ BEGIN RAISE NOTICE '✅ Company settings seeded and storage bucket configured'; END $$;
