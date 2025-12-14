-- Migration: Add logo_url to company_settings
-- Purpose: Allow uploading and displaying company logo

-- Add logo_url column to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for company assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to company-assets bucket
CREATE POLICY "Allow authenticated uploads to company-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

-- Allow public read access to company-assets
CREATE POLICY "Allow public read access to company-assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to company-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete from company-assets
CREATE POLICY "Allow authenticated deletes from company-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');
