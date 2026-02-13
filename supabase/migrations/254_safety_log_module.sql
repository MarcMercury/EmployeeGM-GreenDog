-- =====================================================
-- 254: Workplace Safety & Digital Logging Module
-- Cal/OSHA (Title 8), AVMA, AAHA compliance support
-- =====================================================

-- 1. Safety logs table (polymorphic — form_data JSONB holds per-type fields)
CREATE TABLE IF NOT EXISTS safety_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type      TEXT NOT NULL CHECK (log_type IN (
    'training_attendance',
    'injury_illness',
    'incident_near_miss',
    'hazard_assessment',
    'safety_inspection',
    'fire_emergency_drill',
    'sharps_injury',
    'zoonotic_bite_report',
    'radiation_dosimetry',
    'equipment_maintenance',
    'safety_meeting',
    'emergency_contacts'
  )),
  location      TEXT NOT NULL CHECK (location IN ('venice', 'sherman_oaks', 'van_nuys')),
  form_data     JSONB NOT NULL DEFAULT '{}',
  submitted_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  osha_recordable BOOLEAN DEFAULT false,
  photo_urls    TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed', 'flagged')),
  reviewed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  review_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_safety_logs_type        ON safety_logs (log_type);
CREATE INDEX IF NOT EXISTS idx_safety_logs_location    ON safety_logs (location);
CREATE INDEX IF NOT EXISTS idx_safety_logs_submitted_by ON safety_logs (submitted_by);
CREATE INDEX IF NOT EXISTS idx_safety_logs_submitted_at ON safety_logs (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_logs_status      ON safety_logs (status);
CREATE INDEX IF NOT EXISTS idx_safety_logs_osha        ON safety_logs (osha_recordable) WHERE osha_recordable = true;
CREATE INDEX IF NOT EXISTS idx_safety_logs_form_data   ON safety_logs USING gin (form_data);

-- 3. Auto-update updated_at
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

-- 4. Row-Level Security
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can submit their own logs
CREATE POLICY "safety_logs_insert_own"
  ON safety_logs FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Users can view their own logs
CREATE POLICY "safety_logs_select_own"
  ON safety_logs FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

-- Managers+ can view ALL logs (including OSHA recordable details)
CREATE POLICY "safety_logs_select_managers"
  ON safety_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

-- Managers+ can update (review / flag) any log
CREATE POLICY "safety_logs_update_managers"
  ON safety_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

-- Only admins can delete (soft-delete preferred, but hard-delete for cleanup)
CREATE POLICY "safety_logs_delete_admins"
  ON safety_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 5. Grant table access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;

-- 6. Comment for documentation
COMMENT ON TABLE safety_logs IS 'Workplace safety & compliance digital log system. Supports 12 log types for Cal/OSHA, AVMA, and AAHA compliance. form_data JSONB holds type-specific fields.';
