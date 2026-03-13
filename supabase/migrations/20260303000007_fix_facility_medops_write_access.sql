-- =====================================================
-- Migration: Fix Facility Resources & Med Ops Partners Write Access
-- Date: 2026-03-03
-- Description:
--   1) Grant INSERT/UPDATE/DELETE on facility_resources and
--      facility_resource_locations to authenticated users
--      (revoked by 252_revoke_blanket_grants.sql)
--   2) Grant INSERT/UPDATE/DELETE on med_ops_partners,
--      med_ops_partner_contacts, med_ops_partner_notes
--      (also lost in the blanket revocation)
--   3) Replace admin-only RLS policies on facility_resources
--      and facility_resource_locations with policies that
--      allow all authenticated users to manage records
--      (matching med_ops_partners behaviour)
--   4) Fix SELECT policy on facility_resources so admin/managers
--      can also see inactive resources
-- =====================================================

BEGIN;

-- ═══════════════════════════════════════════════════════
-- 1. Restore table-level write grants
-- ═══════════════════════════════════════════════════════

-- Facility resources
GRANT INSERT, UPDATE, DELETE ON public.facility_resources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.facility_resource_locations TO authenticated;

-- Med Ops partners (these were also missed by 252)
GRANT INSERT, UPDATE, DELETE ON public.med_ops_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.med_ops_partner_contacts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.med_ops_partner_notes TO authenticated;

-- ═══════════════════════════════════════════════════════
-- 2. Replace admin-only RLS on facility_resources
-- ═══════════════════════════════════════════════════════

-- Drop the old restrictive SELECT policy (only showed is_active = true)
DROP POLICY IF EXISTS "All users can view facility resources"
  ON public.facility_resources;

-- Drop the old admin-only management policy
DROP POLICY IF EXISTS "Admins can manage facility resources"
  ON public.facility_resources;

-- New SELECT: all authenticated can see active; admin/manager can also see inactive
CREATE POLICY "Authenticated users can view facility resources"
  ON public.facility_resources
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_active = true
      OR public.is_admin()
      OR (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('manager', 'sup_admin', 'office_admin')
      )
    )
  );

-- New ALL: any authenticated user can insert/update/delete
CREATE POLICY "Authenticated users can manage facility resources"
  ON public.facility_resources
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════
-- 3. Replace admin-only RLS on facility_resource_locations
-- ═══════════════════════════════════════════════════════

-- Drop old management policy
DROP POLICY IF EXISTS "Admins can manage resource locations"
  ON public.facility_resource_locations;

-- New ALL: any authenticated user can manage
CREATE POLICY "Authenticated users can manage resource locations"
  ON public.facility_resource_locations
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
