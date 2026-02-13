-- Migration: 253_fix_appointment_rls_precedence.sql
-- Date: 2026-02-13
-- Purpose: Fix SQL operator precedence bug in appointment table RLS policies.
--
-- The original policies in 202b_appointment_analysis.sql had:
--   WHERE id = auth.uid() OR auth_user_id = auth.uid() AND role IN (...)
--
-- Due to AND binding tighter than OR, this evaluated as:
--   WHERE id = auth.uid() OR (auth_user_id = auth.uid() AND role IN (...))
--
-- This incorrectly grants access to anyone whose profiles.id matches auth.uid()
-- regardless of their role. Fixed with proper parentheses and using only
-- auth_user_id (the correct foreign key to auth.users).

BEGIN;

-- Drop existing broken policies
DROP POLICY IF EXISTS "appointment_data_admin" ON appointment_data;
DROP POLICY IF EXISTS "appointment_analysis_admin" ON appointment_analysis_runs;
DROP POLICY IF EXISTS "appointment_mapping_admin" ON appointment_service_mapping;

-- Recreate with correct operator precedence
CREATE POLICY "appointment_data_admin" ON appointment_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "appointment_analysis_admin" ON appointment_analysis_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "appointment_mapping_admin" ON appointment_service_mapping
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

COMMIT;
