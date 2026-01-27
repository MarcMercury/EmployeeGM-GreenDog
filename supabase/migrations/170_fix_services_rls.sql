-- ============================================================================
-- MIGRATION 170: Fix Services and Staffing Requirements RLS Policies
-- The policies were incorrectly using profiles.id instead of profiles.auth_user_id
-- ============================================================================

-- ============================================================================
-- 1. FIX SERVICES RLS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "services_modify_admin" ON services;
CREATE POLICY "services_modify_admin" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'manager', 'hr_admin'))
);

-- ============================================================================
-- 2. FIX STAFFING REQUIREMENTS RLS POLICY
-- ============================================================================
DROP POLICY IF EXISTS "staffing_reqs_modify_admin" ON service_staffing_requirements;
CREATE POLICY "staffing_reqs_modify_admin" ON service_staffing_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'manager', 'hr_admin'))
);

-- ============================================================================
-- 3. ALSO FIX SERVICE_SLOTS IF IT HAS THE SAME ISSUE
-- ============================================================================
DROP POLICY IF EXISTS "service_slots_modify_admin" ON service_slots;
CREATE POLICY "service_slots_modify_admin" ON service_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'manager', 'hr_admin'))
);

-- ============================================================================
-- COMPLETE
-- ============================================================================
