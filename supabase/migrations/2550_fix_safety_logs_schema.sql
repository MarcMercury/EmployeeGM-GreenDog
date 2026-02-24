-- =====================================================
-- 255: Fix safety_logs table schema
--
-- Resolves conflicts between migrations 20260218 and 254.
-- Ensures submitted_by references profiles(id), adds
-- reviewed_by/reviewed_at/review_notes if missing, removes
-- overly restrictive log_type CHECK, and fixes RLS policies.
--
-- Safe to run multiple times (all operations are idempotent).
-- =====================================================

-- 1. Add missing columns if they don't exist
ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE safety_logs ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 2. Drop the restrictive log_type CHECK constraint (if exists)
--    so custom log types and newer built-in types can be inserted.
DO $$
BEGIN
  -- Drop any CHECK constraint on log_type by name patterns
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'safety_logs'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%log_type%'
  ) THEN
    EXECUTE (
      SELECT string_agg('ALTER TABLE safety_logs DROP CONSTRAINT ' || constraint_name, '; ')
      FROM information_schema.table_constraints
      WHERE table_name = 'safety_logs'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%log_type%'
    );
  END IF;

  -- Also check pg_constraint for unnamed/auto-named CHECK constraints on log_type
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'safety_logs'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%log_type%'
  ) THEN
    EXECUTE (
      SELECT string_agg('ALTER TABLE safety_logs DROP CONSTRAINT ' || c.conname, '; ')
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'safety_logs'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%log_type%'
    );
  END IF;
END $$;

-- Re-add a permissive CHECK (just ensure it's not empty)
ALTER TABLE safety_logs ADD CONSTRAINT safety_logs_log_type_not_empty CHECK (log_type != '');

-- 3. Fix the submitted_by FK: drop FK to auth.users, add FK to profiles
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find FK constraint on submitted_by that references auth.users
  SELECT c.conname INTO fk_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  JOIN pg_class rt ON c.confrelid = rt.oid
  JOIN pg_namespace rn ON rt.relnamespace = rn.oid
  WHERE t.relname = 'safety_logs'
    AND a.attname = 'submitted_by'
    AND c.contype = 'f'
    AND rn.nspname = 'auth'
    AND rt.relname = 'users';

  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE safety_logs DROP CONSTRAINT ' || fk_name;
    RAISE NOTICE 'Dropped FK constraint % (submitted_by -> auth.users)', fk_name;
  END IF;
END $$;

-- Add FK to profiles(id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    JOIN pg_class rt ON c.confrelid = rt.oid
    WHERE t.relname = 'safety_logs'
      AND a.attname = 'submitted_by'
      AND c.contype = 'f'
      AND rt.relname = 'profiles'
  ) THEN
    ALTER TABLE safety_logs
      ADD CONSTRAINT safety_logs_submitted_by_fk
      FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK constraint submitted_by -> profiles(id)';
  END IF;
END $$;

-- Add FK on reviewed_by -> profiles(id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    JOIN pg_class rt ON c.confrelid = rt.oid
    WHERE t.relname = 'safety_logs'
      AND a.attname = 'reviewed_by'
      AND c.contype = 'f'
      AND rt.relname = 'profiles'
  ) THEN
    ALTER TABLE safety_logs
      ADD CONSTRAINT safety_logs_reviewed_by_fk
      FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK constraint reviewed_by -> profiles(id)';
  END IF;
END $$;

-- 4. Fix RLS policies — drop all old variants and recreate correctly
-- The key fix: submitted_by stores profile.id, not auth.uid(),
-- so policies must use a subquery to map auth.uid() → profile.id.

DROP POLICY IF EXISTS "Users can view own safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Managers can view all safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Users can submit safety logs" ON safety_logs;
DROP POLICY IF EXISTS "Admins can update safety logs" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_insert_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_update_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_delete_admins" ON safety_logs;

ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: Users can submit logs for their own profile
CREATE POLICY "safety_logs_insert_own"
  ON safety_logs FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- SELECT: Users can view their own logs
CREATE POLICY "safety_logs_select_own"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- SELECT: Managers can view ALL logs
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

-- UPDATE: Managers can review / flag any log
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

-- DELETE: Only super_admin / admin
CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 5. Ensure authenticated role has access
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;

-- 6. Auto-update updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION update_safety_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_safety_logs_updated_at ON safety_logs;
CREATE TRIGGER trg_safety_logs_updated_at
  BEFORE UPDATE ON safety_logs
  FOR EACH ROW EXECUTE FUNCTION update_safety_logs_updated_at();
