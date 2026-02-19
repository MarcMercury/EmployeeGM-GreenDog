-- =====================================================
-- MANUAL FIX: Safety Logs RLS Policies
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "safety_logs_insert_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_update_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_delete_admins" ON safety_logs;

-- Step 2: Ensure RLS is enabled
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate policies with correct auth logic
-- INSERT policy: Users can submit logs for their own profile
CREATE POLICY "safety_logs_insert_own"
  ON safety_logs FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- SELECT policy: Users can view their own logs  
CREATE POLICY "safety_logs_select_own"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- SELECT policy: Managers can view all logs
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

-- UPDATE policy: Managers can review/flag logs
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

-- DELETE policy: Only super admins can delete
CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;
GRANT REFERENCES ON safety_logs TO authenticated;

-- Verify policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'safety_logs'
ORDER BY policyname;
