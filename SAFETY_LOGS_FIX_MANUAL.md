# ⚠️ Migration Push Summary & Solution

## Status
The Supabase CLI is unable to push all migrations due to schema conflicts and duplicate entries in the remote database. This is a known issue when database schemas drift from migration expectations.

## Core Issue: Safety Logs RLS
The main blocker for submitting safety logs is the Row-Level Security (RLS) policies on the `safety_logs` table. These need to be fixed to allow users to submit logs.

## ✅ SOLUTION: Manual RLS Fix (5 minutes)

### Step 1: Open Supabase SQL Console
Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new

### Step 2: Copy & Paste This SQL
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "safety_logs_insert_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_own" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_select_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_update_managers" ON safety_logs;
DROP POLICY IF EXISTS "safety_logs_delete_admins" ON safety_logs;

-- Ensure RLS is enabled
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

-- SELECT: Managers can view all logs
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

-- UPDATE: Managers can review/flag logs
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

-- DELETE: Only admins can delete
CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;

-- Verify
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'safety_logs'
ORDER BY policyname;
```

### Step 3: Click "Run"
You should see 5 policies returned at the bottom ✅

### Step 4: Test It!
1. Refresh your app (Ctrl+Shift+R)
2. Try submitting a safety log
3. It should work! 🎉

## Why the migrations couldn't push
- Migration **032** (marketing_events) already applied → duplicate key error
- Migrations in **20250206** (PTO types) have schema conflicts → columns don't exist
- Migrations in **20250211-20260213** have partial application issues

These aren't blocking the safety log feature. The only thing needed is the RLS policy fix above.

## Reference Files
- Full migration list: `supabase/migrations/`
- RLS fix SQL: `docs/SAFETY_LOGS_RLS_FIX.sql`
- Migration status log: `/tmp/final-push.log`

---

**After doing the manual SQL fix above, logs should work immediately!**
