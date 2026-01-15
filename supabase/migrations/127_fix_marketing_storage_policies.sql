-- =====================================================
-- Migration 127: Fix Marketing Storage Policies
-- =====================================================
-- Description: Updates storage RLS policies for marketing-resources bucket
-- to also allow users with marketing_admin role to upload files
-- =====================================================

-- Create helper function for marketing admin check
CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO anon;

-- =====================================================
-- Update Storage RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "marketing_resources_insert" ON storage.objects;
DROP POLICY IF EXISTS "marketing_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "marketing_resources_delete" ON storage.objects;

-- Only marketing admins can upload (includes admin, super_admin, marketing_admin)
CREATE POLICY "marketing_resources_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-resources' 
  AND public.is_marketing_admin()
);

-- Only marketing admins can update
CREATE POLICY "marketing_resources_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing-resources' 
  AND public.is_marketing_admin()
);

-- Only marketing admins can delete
CREATE POLICY "marketing_resources_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-resources' 
  AND public.is_marketing_admin()
);

-- =====================================================
-- Also fix marketing_resources table RLS if missing
-- =====================================================
ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "marketing_resources_select_all" ON public.marketing_resources;
DROP POLICY IF EXISTS "marketing_resources_admin_all" ON public.marketing_resources;

-- All authenticated users can view non-admin-only resources
CREATE POLICY "marketing_resources_select_all"
ON public.marketing_resources FOR SELECT
TO authenticated
USING (
  NOT admin_only 
  OR public.is_marketing_admin()
);

-- Only marketing admins can insert/update/delete
CREATE POLICY "marketing_resources_admin_all"
ON public.marketing_resources FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());

-- =====================================================
-- Also fix marketing_folders table RLS
-- =====================================================
ALTER TABLE public.marketing_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "marketing_folders_select_all" ON public.marketing_folders;
DROP POLICY IF EXISTS "marketing_folders_admin_all" ON public.marketing_folders;

-- All authenticated users can view non-admin-only folders
CREATE POLICY "marketing_folders_select_all"
ON public.marketing_folders FOR SELECT
TO authenticated
USING (
  NOT admin_only 
  OR public.is_marketing_admin()
);

-- Only marketing admins can manage folders
CREATE POLICY "marketing_folders_admin_all"
ON public.marketing_folders FOR ALL
TO authenticated
USING (public.is_marketing_admin())
WITH CHECK (public.is_marketing_admin());
