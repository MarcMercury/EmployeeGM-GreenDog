-- =====================================================
-- MIGRATION 201: Fix Marketing Events Storage Bucket
-- =====================================================
-- Makes the marketing-events bucket public so that
-- uploaded files can be accessed via public URLs.
-- =====================================================

-- Make the bucket public (required for getPublicUrl to work)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'marketing-events';

-- Ensure the bucket exists and is public (in case it doesn't exist yet)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-events', 'marketing-events', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add policy for public read access to marketing-events files
DROP POLICY IF EXISTS "Public can view marketing-events files" ON storage.objects;
CREATE POLICY "Public can view marketing-events files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-events');
