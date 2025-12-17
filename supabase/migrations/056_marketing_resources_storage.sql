-- Migration: 056_marketing_resources_storage
-- Description: Create storage bucket for marketing resources and add admin_only field

-- =====================================================
-- 1. ADD MISSING COLUMNS TO MARKETING_RESOURCES
-- =====================================================
ALTER TABLE public.marketing_resources
ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- =====================================================
-- 2. CREATE MARKETING RESOURCES STORAGE BUCKET
-- =====================================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-resources',
  'marketing-resources', 
  false, 
  104857600, -- 100MB max file size
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'video/mp4', 'video/quicktime', 'video/webm',
    'text/plain', 'text/html', 'text/css',
    'application/postscript', 'application/illustrator'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. STORAGE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "marketing_resources_select" ON storage.objects;
DROP POLICY IF EXISTS "marketing_resources_insert" ON storage.objects;
DROP POLICY IF EXISTS "marketing_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "marketing_resources_delete" ON storage.objects;

-- All authenticated users can view marketing resources
CREATE POLICY "marketing_resources_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marketing-resources');

-- Only admins can upload
CREATE POLICY "marketing_resources_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-resources' 
  AND public.is_admin()
);

-- Only admins can update
CREATE POLICY "marketing_resources_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing-resources' 
  AND public.is_admin()
);

-- Only admins can delete
CREATE POLICY "marketing_resources_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-resources' 
  AND public.is_admin()
);

-- =====================================================
-- 4. ADD FOLDER STRUCTURE SUPPORT
-- =====================================================

-- Create folders table for organizing resources
CREATE TABLE IF NOT EXISTS public.marketing_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.marketing_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL DEFAULT '',
  description TEXT,
  icon TEXT DEFAULT 'mdi-folder',
  color TEXT DEFAULT 'amber-darken-2',
  admin_only BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.marketing_folders ENABLE ROW LEVEL SECURITY;

-- Policies for folders
CREATE POLICY "marketing_folders_view" ON public.marketing_folders
  FOR SELECT USING (auth.uid() IS NOT NULL AND (admin_only = false OR public.is_admin()));

CREATE POLICY "marketing_folders_admin_all" ON public.marketing_folders
  FOR ALL USING (public.is_admin());

-- Index for path lookups
CREATE INDEX IF NOT EXISTS idx_marketing_folders_path ON public.marketing_folders(path);
CREATE INDEX IF NOT EXISTS idx_marketing_folders_parent ON public.marketing_folders(parent_id);

-- Index for marketing resources
CREATE INDEX IF NOT EXISTS idx_marketing_resources_folder ON public.marketing_resources(folder_path);
CREATE INDEX IF NOT EXISTS idx_marketing_resources_archived ON public.marketing_resources(is_archived);

-- Grant permissions
GRANT ALL ON public.marketing_folders TO authenticated;
GRANT SELECT ON public.marketing_folders TO anon;

-- =====================================================
-- 5. SEED DEFAULT FOLDER STRUCTURE
-- =====================================================

INSERT INTO public.marketing_folders (id, name, path, description, icon, color, admin_only, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Event Production', 'event-production', 'Logistics, venues, catering, and event vendors', 'mdi-party-popper', '#E91E63', false, 1),
  ('22222222-2222-2222-2222-222222222222', 'Community & Outreach', 'community-outreach', 'External relationships and networking materials', 'mdi-account-group', '#4CAF50', false, 2),
  ('33333333-3333-3333-3333-333333333333', 'Brand & Creative Assets', 'brand-creative', 'Logos, templates, style guides, and photography', 'mdi-palette', '#9C27B0', false, 3),
  ('44444444-4444-4444-4444-444444444444', 'Promotion & Merchandise', 'promotion-merch', 'Swag, uniforms, printing specs, and PR materials', 'mdi-gift', '#FF9800', false, 4),
  ('55555555-5555-5555-5555-555555555555', 'Internal Marketing Tools', 'internal-tools', 'SOPs, talking points, and campaign archives', 'mdi-book-open-variant', '#2196F3', false, 5),
  ('66666666-6666-6666-6666-666666666666', 'Vendor Contracts & Rates', 'vendor-contracts', 'Confidential vendor agreements and pricing', 'mdi-file-document-multiple', '#607D8B', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert subfolders
INSERT INTO public.marketing_folders (name, parent_id, path, icon, sort_order)
VALUES
  -- Event Production subfolders
  ('Venue & Facilities', '11111111-1111-1111-1111-111111111111', 'event-production/venues', 'mdi-map-marker', 1),
  ('Food & Beverage', '11111111-1111-1111-1111-111111111111', 'event-production/food-bev', 'mdi-food', 2),
  ('Entertainment & Talent', '11111111-1111-1111-1111-111111111111', 'event-production/entertainment', 'mdi-music', 3),
  ('Event Equipment', '11111111-1111-1111-1111-111111111111', 'event-production/equipment', 'mdi-speaker', 4),
  ('Permits & Legal', '11111111-1111-1111-1111-111111111111', 'event-production/permits', 'mdi-file-document', 5),
  
  -- Brand Creative subfolders
  ('Brand Identity', '33333333-3333-3333-3333-333333333333', 'brand-creative/brand-identity', 'mdi-star', 1),
  ('Print Collateral', '33333333-3333-3333-3333-333333333333', 'brand-creative/print-collateral', 'mdi-printer', 2),
  ('Digital Assets', '33333333-3333-3333-3333-333333333333', 'brand-creative/digital-assets', 'mdi-monitor', 3),
  ('Photography Library', '33333333-3333-3333-3333-333333333333', 'brand-creative/photography', 'mdi-camera', 4),
  
  -- Internal Tools subfolders
  ('Talking Points & Scripts', '55555555-5555-5555-5555-555555555555', 'internal-tools/talking-points', 'mdi-script-text', 1),
  ('Campaign Archives', '55555555-5555-5555-5555-555555555555', 'internal-tools/campaign-archives', 'mdi-archive', 2),
  ('SOPs & Procedures', '55555555-5555-5555-5555-555555555555', 'internal-tools/sops', 'mdi-book', 3),
  
  -- Vendor Contracts subfolders (admin only inherited from parent)
  ('Active Contracts', '66666666-6666-6666-6666-666666666666', 'vendor-contracts/contracts', 'mdi-file-sign', 1),
  ('Rate Sheets', '66666666-6666-6666-6666-666666666666', 'vendor-contracts/pricing', 'mdi-currency-usd', 2),
  ('Expired/Archived', '66666666-6666-6666-6666-666666666666', 'vendor-contracts/expired', 'mdi-archive-outline', 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE public.marketing_folders IS 'Folder structure for organizing marketing resources';
COMMENT ON COLUMN public.marketing_resources.admin_only IS 'Whether this resource is only visible to admins';
