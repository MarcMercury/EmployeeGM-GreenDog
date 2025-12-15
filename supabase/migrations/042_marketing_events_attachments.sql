-- =====================================================
-- MIGRATION 042: Marketing Events - Attachments & Links
-- =====================================================
-- Adds support for attaching documents and saving
-- external hyperlinks to marketing events.
-- =====================================================

-- Add attachments and external links columns to marketing_events
ALTER TABLE public.marketing_events 
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb;

-- Comments
COMMENT ON COLUMN public.marketing_events.attachments IS 'Array of attached document objects: [{name, url, file_type, uploaded_at}]';
COMMENT ON COLUMN public.marketing_events.external_links IS 'Array of external link objects: [{title, url, description}]';

-- Create storage bucket for marketing event attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-events', 'marketing-events', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketing-events bucket
CREATE POLICY "Authenticated users can upload to marketing-events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-events');

CREATE POLICY "Authenticated users can view marketing-events files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marketing-events');

CREATE POLICY "Admins can delete marketing-events files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-events' 
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = (SELECT id FROM public.employees WHERE email_work = auth.jwt() ->> 'email')
    AND e.access_level = 'admin'
  )
);
