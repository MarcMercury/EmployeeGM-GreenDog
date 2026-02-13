-- =====================================================
-- 255: Fix Safety Logs RLS policies
--
-- The migration 254 used `submitted_by = auth.uid()` but submitted_by
-- stores profiles.id (profile UUID), while auth.uid() returns
-- auth.users.id (auth UUID). These are different columns:
--   profiles.id           = profile PK
--   profiles.auth_user_id = matches auth.uid()
--
-- Fix: use a subquery to resolve the profile id from auth.uid().
-- =====================================================

-- Drop the broken policies
DROP POLICY IF EXISTS "safety_logs_insert_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_own" ON safety_logs;

-- Re-create with correct auth check
-- Users can insert logs where submitted_by matches their profile id
CREATE POLICY "safety_logs_insert_own"
  ON safety_logs FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Users can view their own logs
CREATE POLICY "safety_logs_select_own"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    submitted_by = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Also fix the manager policies that used profiles.id = auth.uid()
-- (they happen to work because the EXISTS subquery checks profiles.id = auth.uid()
--  which would fail for non-matching rows, but let's fix them to be correct)
DROP POLICY IF EXISTS "safety_logs_select_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_update_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_delete_admins" ON safety_logs;

CREATE POLICY "safety_logs_select_managers"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

CREATE POLICY "safety_logs_update_managers"
  ON safety_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );
