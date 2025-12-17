-- =====================================================
-- Migration: Fix Recruiting RLS and Storage
-- Description: Fix candidate_documents and candidate_skills RLS 
--   policies to properly allow admin INSERT/UPDATE operations
-- =====================================================

-- =====================================================
-- STEP 1: Fix candidate_skills RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage candidate skills" ON public.candidate_skills;

-- Create proper admin policy with WITH CHECK
CREATE POLICY "Admins can manage candidate skills"
ON public.candidate_skills
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_skills TO authenticated;

-- =====================================================
-- STEP 2: Fix candidate_documents RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage candidate documents" ON public.candidate_documents;

-- Create proper admin policy with WITH CHECK
CREATE POLICY "Admins can manage candidate documents"
ON public.candidate_documents
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_documents TO authenticated;

-- =====================================================
-- STEP 3: Fix candidate_notes RLS (just in case)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage candidate notes" ON public.candidate_notes;

CREATE POLICY "Admins can manage candidate notes"
ON public.candidate_notes
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_notes TO authenticated;

-- =====================================================
-- STEP 4: Ensure storage bucket exists for candidate documents
-- NOTE: Storage bucket creation is handled in Supabase dashboard or via API
-- This SQL ensures the policies exist for the bucket
-- =====================================================

-- Create storage bucket policy for candidate-documents (if bucket exists)
-- Admins can upload/download candidate documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidate-documents bucket
DROP POLICY IF EXISTS "Admins can upload candidate documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view candidate documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete candidate documents" ON storage.objects;

CREATE POLICY "Admins can upload candidate documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'candidate-documents' 
  AND public.is_admin()
);

CREATE POLICY "Admins can view candidate documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'candidate-documents' 
  AND public.is_admin()
);

CREATE POLICY "Admins can delete candidate documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'candidate-documents' 
  AND public.is_admin()
);

CREATE POLICY "Admins can update candidate documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'candidate-documents' 
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'candidate-documents' 
  AND public.is_admin()
);
