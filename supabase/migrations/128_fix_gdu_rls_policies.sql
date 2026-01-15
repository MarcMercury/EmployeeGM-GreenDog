-- =====================================================
-- Migration 128: Fix GDU/Student Program RLS Policies
-- =====================================================
-- Description: Updates RLS policies on person_program_data to include
-- marketing_admin role (GDU pages use marketing_admin middleware)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access to program data" ON public.person_program_data;
DROP POLICY IF EXISTS "GDU coordinators can manage program data" ON public.person_program_data;

-- Admin full access
CREATE POLICY "Admins have full access to program data"
  ON public.person_program_data
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- GDU/Marketing admins can manage program data
-- This now includes marketing_admin which is used by the GDU middleware
CREATE POLICY "GDU coordinators can manage program data"
  ON public.person_program_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  );

-- Also fix the student_program_view permissions
-- The view should be accessible by GDU users
GRANT SELECT ON public.student_program_view TO authenticated;

-- =====================================================
-- Also update unified_persons RLS for GDU access
-- =====================================================
DROP POLICY IF EXISTS "GDU can manage unified persons" ON public.unified_persons;

CREATE POLICY "GDU can manage unified persons"
  ON public.unified_persons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  );
