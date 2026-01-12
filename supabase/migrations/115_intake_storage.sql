-- =====================================================
-- Migration: Add Storage for Intake Documents
-- Creates storage bucket and policies for resume uploads
-- =====================================================

-- Note: Supabase Storage buckets are typically created via the Dashboard or API
-- This migration ensures the storage policies are in place

-- Create the intake-documents bucket if it doesn't exist
-- (Bucket creation is typically done via Dashboard, this is for documentation)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'intake-documents',
--   'intake-documents',
--   false,  -- Not public - requires authentication
--   10485760,  -- 10MB limit
--   ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for intake-documents bucket
-- Note: These policies require the bucket to exist first

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload intake documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload intake documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'intake-documents');

-- Allow admins to read all files
DROP POLICY IF EXISTS "Admins can read intake documents" ON storage.objects;
CREATE POLICY "Admins can read intake documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'intake-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'manager')
  )
);

-- Allow users to read their own uploaded files
DROP POLICY IF EXISTS "Users can read own intake documents" ON storage.objects;
CREATE POLICY "Users can read own intake documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'intake-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to delete files
DROP POLICY IF EXISTS "Admins can delete intake documents" ON storage.objects;
CREATE POLICY "Admins can delete intake documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'intake-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Public upload policy for intake forms (with token validation)
-- This allows anonymous users to upload if they have a valid intake token
DROP POLICY IF EXISTS "Public can upload with valid intake token" ON storage.objects;
CREATE POLICY "Public can upload with valid intake token"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'intake-documents'
  AND (storage.foldername(name))[1] = 'public-intake'
  AND EXISTS (
    SELECT 1 FROM public.intake_links
    WHERE token = (storage.foldername(name))[2]
    AND status IN ('pending', 'sent', 'viewed')
    AND expires_at > NOW()
  )
);

-- Add resume_url column to unified_persons if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'unified_persons' 
    AND column_name = 'resume_url'
  ) THEN
    ALTER TABLE public.unified_persons ADD COLUMN resume_url TEXT;
  END IF;
END $$;

-- Add documents JSONB column for multiple document references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'unified_persons' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.unified_persons ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create index for document searches
CREATE INDEX IF NOT EXISTS idx_unified_persons_documents ON public.unified_persons USING GIN (documents);
