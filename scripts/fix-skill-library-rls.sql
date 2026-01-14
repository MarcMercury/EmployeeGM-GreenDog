-- Run this in Supabase SQL Editor to fix skill_library RLS policies
-- This fixes the 406 error when creating skills

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage skill library" ON public.skill_library;
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_all" ON public.skill_library;
DROP POLICY IF EXISTS "All authenticated users can view skill library" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_select" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_insert" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_update" ON public.skill_library;
DROP POLICY IF EXISTS "skill_library_admin_delete" ON public.skill_library;

-- Everyone can read skills
CREATE POLICY "skill_library_select"
ON public.skill_library FOR SELECT
TO authenticated
USING (true);

-- Only admins can create skills (uses auth_user_id, not id!)
CREATE POLICY "skill_library_admin_insert"
ON public.skill_library FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Only admins can update skills
CREATE POLICY "skill_library_admin_update"
ON public.skill_library FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Only admins can delete skills
CREATE POLICY "skill_library_admin_delete"
ON public.skill_library FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Verify policies were created
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'skill_library';
