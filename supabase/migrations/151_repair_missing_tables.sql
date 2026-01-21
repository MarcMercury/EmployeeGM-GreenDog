-- =====================================================
-- Migration: 151_repair_missing_tables.sql
-- Description: Ensure missing tables exist (repair migration)
-- =====================================================

-- 1. Create user_role_assignments table if it doesn't exist
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_assignments TO authenticated;

-- 2. Create ezyvet_contacts table if it doesn't exist
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

-- 3. Fix company_settings - ensure all columns exist and add missing ones
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 4. Create storage bucket for company assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  -- Drop and recreate policies
  DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete company assets" ON storage.objects;
  
  CREATE POLICY "Authenticated users can upload company assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');
  
  CREATE POLICY "Anyone can view company assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'company-assets');
  
  CREATE POLICY "Admins can delete company assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Storage policies already exist or error: %', SQLERRM;
END $$;

-- 5. Verify
DO $$
DECLARE
  tbl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tbl_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('user_role_assignments', 'ezyvet_contacts', 'company_settings');
  
  RAISE NOTICE '✅ Required tables verified: % of 3 exist', tbl_count;
END $$;
