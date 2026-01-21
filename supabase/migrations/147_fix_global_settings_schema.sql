-- =====================================================
-- Migration: 147_fix_global_settings_schema.sql
-- Description: Add missing columns and fix schema issues
-- =====================================================

-- 1. Add missing columns to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update display_name to match company_name if set
UPDATE public.company_settings
SET company_name = COALESCE(company_name, display_name, legal_name);

-- 2. Add description column to departments if missing
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Create user_role_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, role_key)
);

-- Enable RLS
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_role_assignments
DROP POLICY IF EXISTS "user_role_assignments_view" ON public.user_role_assignments;
CREATE POLICY "user_role_assignments_view"
ON public.user_role_assignments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "user_role_assignments_admin_manage" ON public.user_role_assignments;
CREATE POLICY "user_role_assignments_admin_manage"
ON public.user_role_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Grant permissions
GRANT SELECT ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_role_assignments TO authenticated;

-- 4. Create ezyvet_contacts table if it doesn't exist (for integration check)
CREATE TABLE IF NOT EXISTS public.ezyvet_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ezyvet_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ezyvet_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ezyvet_contacts_authenticated_view" ON public.ezyvet_contacts;
CREATE POLICY "ezyvet_contacts_authenticated_view"
ON public.ezyvet_contacts
FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.ezyvet_contacts TO authenticated;

-- 5. Seed initial company settings if empty
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

-- 6. Create storage bucket for company assets if not exists
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

RAISE NOTICE '✅ Global settings schema fixed - added missing columns and tables';
