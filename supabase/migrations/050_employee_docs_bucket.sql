-- Migration: 050_employee_docs_bucket.sql
-- Purpose: Create storage bucket for employee documents
-- Created: December 16, 2025

-- =====================================================
-- STORAGE BUCKET FOR EMPLOYEE DOCUMENTS
-- =====================================================

-- Create the employee-docs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-docs',
  'employee-docs',
  false,  -- Private bucket - requires RLS
  52428800,  -- 50MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload to their employee folder
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-docs'
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text FROM public.employees e WHERE e.profile_id = auth.uid()
  )
);

-- Admins can upload to any folder
CREATE POLICY "Admins can upload to any folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-docs'
  AND public.is_admin()
);

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.employees e WHERE e.profile_id = auth.uid()
    )
    OR public.is_admin()
  )
);

-- Admins can delete any document
CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND public.is_admin()
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-docs'
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text FROM public.employees e WHERE e.profile_id = auth.uid()
  )
);
