-- =====================================================
-- 20260219a: Final comprehensive fix for safety_logs RLS
-- This migration removes ALL existing safety_logs policies and creates correct ones
-- =====================================================

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "safety_logs_insert_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_update_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_delete_admins" ON safety_logs;

-- Drop old broken policies from 254
DROP POLICY IF EXISTS "Users can submit safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Users can view own safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Managers can view all safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Admins can update safety logs" ON safety_logs;

-- Ensure RLS is enabled
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can INSERT their own logs
-- submitted_by (UUID) must match a profile.id where profile.auth_user_id = auth.uid()
CREATE POLICY "safety_logs_insert_own"
  ON safety_logs FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 2: Users can SELECT their own logs
CREATE POLICY "safety_logs_select_own"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    submitted_by IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 3: Managers and admins can SELECT all logs
CREATE POLICY "safety_logs_select_managers"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN (
          'super_admin', 'admin', 'manager', 'hr_admin', 
          'sup_admin', 'office_admin', 'marketing_admin'
        )
    )
  );

-- Policy 4: Managers and admins can UPDATE (review/flag) logs
CREATE POLICY "safety_logs_update_managers"
  ON safety_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN (
          'super_admin', 'admin', 'manager', 'hr_admin', 
          'sup_admin', 'office_admin', 'marketing_admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN (
          'super_admin', 'admin', 'manager', 'hr_admin', 
          'sup_admin', 'office_admin', 'marketing_admin'
        )
    )
  );

-- Policy 5: Only super_admin and admin can DELETE logs
CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Verify grants
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;
GRANT REFERENCES ON safety_logs TO authenticated;

-- Comments
COMMENT ON POLICY "safety_logs_insert_own" ON safety_logs IS 'Users can insert safety logs for their own profile';
COMMENT ON POLICY "safety_logs_select_own" ON safety_logs IS 'Users can view their own safety logs';
COMMENT ON POLICY "safety_logs_select_managers" ON safety_logs IS 'Managers and admins can view all safety logs';
COMMENT ON POLICY "safety_logs_update_managers" ON safety_logs IS 'Managers and admins can update (review/flag) any safety log';
COMMENT ON POLICY "safety_logs_delete_admins" ON safety_logs IS 'Only super admins and admins can delete safety logs';
