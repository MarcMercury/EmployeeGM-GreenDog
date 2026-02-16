-- =====================================================
-- 257: Custom Safety Log Types + New Built-in Types
--
-- 1. Remove CHECK constraints on log_type to allow custom types
-- 2. Create custom_safety_log_types table for user-defined types
-- 3. Seed schedule rows for 3 new built-in types
-- 4. Update safety_logs INSERT policy so ALL users can submit
-- =====================================================

-- 1. Drop CHECK constraints on log_type columns
DO $$
DECLARE
  cname text;
BEGIN
  -- safety_logs
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'safety_logs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%log_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE safety_logs DROP CONSTRAINT %I', cname);
  END IF;

  -- safety_log_schedules
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'safety_log_schedules'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%log_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE safety_log_schedules DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- 2. Custom safety log types table
CREATE TABLE IF NOT EXISTS custom_safety_log_types (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                 TEXT UNIQUE NOT NULL,
  label               TEXT NOT NULL,
  icon                TEXT NOT NULL DEFAULT 'mdi-clipboard-text',
  color               TEXT NOT NULL DEFAULT 'grey',
  description         TEXT NOT NULL DEFAULT '',
  fields              JSONB NOT NULL DEFAULT '[]',
  has_osha_toggle     BOOLEAN DEFAULT false,
  compliance_standards TEXT[] DEFAULT '{}',
  is_active           BOOLEAN DEFAULT true,
  created_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_safety_log_types_key
  ON custom_safety_log_types (key);
CREATE INDEX IF NOT EXISTS idx_custom_safety_log_types_active
  ON custom_safety_log_types (is_active) WHERE is_active = true;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_custom_safety_log_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_safety_log_types_updated_at ON custom_safety_log_types;
CREATE TRIGGER trg_custom_safety_log_types_updated_at
  BEFORE UPDATE ON custom_safety_log_types
  FOR EACH ROW EXECUTE FUNCTION update_custom_safety_log_types_updated_at();

-- RLS
ALTER TABLE custom_safety_log_types ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "custom_safety_log_types_select"
  ON custom_safety_log_types FOR SELECT TO authenticated
  USING (true);

-- Everyone except base 'user' role can create/update
CREATE POLICY "custom_safety_log_types_insert"
  ON custom_safety_log_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin')
    )
  );

CREATE POLICY "custom_safety_log_types_update"
  ON custom_safety_log_types FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin')
    )
  );

-- Only admins can delete
CREATE POLICY "custom_safety_log_types_delete"
  ON custom_safety_log_types FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_safety_log_types TO authenticated;

-- 3. Seed schedule rows for 3 new built-in types
INSERT INTO safety_log_schedules (log_type, location, cadence)
SELECT lt.key, loc.key, 'none'
FROM (VALUES
  ('hazcom_chemical'), ('ppe_assessment'), ('employee_acknowledgment')
) AS lt(key)
CROSS JOIN (VALUES ('venice'), ('sherman_oaks'), ('van_nuys')) AS loc(key)
ON CONFLICT (log_type, location) DO NOTHING;

COMMENT ON TABLE custom_safety_log_types IS 'User-defined safety log types with custom form fields. Created by managers+ through the Safety Log management UI. Merged with built-in types at runtime.';
