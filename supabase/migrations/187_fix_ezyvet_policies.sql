-- =====================================================
-- Migration 187: Fix EzyVet RLS Policies
-- =====================================================
-- Problem: The FOR ALL policies on ezyvet tables are missing 
-- WITH CHECK clauses, which are required for INSERT operations.
-- This prevents admins from inserting into ezyvet_sync_history 
-- even though they have the correct role.
-- =====================================================

-- =====================================================
-- SECTION 1: Fix ezyvet_crm_contacts policies
-- =====================================================

-- Drop and recreate the "Admin manage" policy with proper WITH CHECK
DROP POLICY IF EXISTS "Admin manage ezyvet contacts" ON public.ezyvet_crm_contacts;

CREATE POLICY "Admin manage ezyvet contacts" ON public.ezyvet_crm_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- SECTION 2: Fix ezyvet_sync_history policies
-- =====================================================

-- Drop and recreate the "Admin manage" policy with proper WITH CHECK
DROP POLICY IF EXISTS "Admin manage ezyvet sync history" ON public.ezyvet_sync_history;

CREATE POLICY "Admin manage ezyvet sync history" ON public.ezyvet_sync_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- SECTION 3: Verify RLS is enabled
-- =====================================================
ALTER TABLE public.ezyvet_crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezyvet_sync_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 4: Add comments
-- =====================================================
COMMENT ON POLICY "Admin manage ezyvet contacts" ON public.ezyvet_crm_contacts IS 
  'Allows admin and super_admin to perform all operations (SELECT, INSERT, UPDATE, DELETE) on EzyVet contacts';

COMMENT ON POLICY "Admin manage ezyvet sync history" ON public.ezyvet_sync_history IS 
  'Allows admin and super_admin to perform all operations (SELECT, INSERT, UPDATE, DELETE) on EzyVet sync history';
