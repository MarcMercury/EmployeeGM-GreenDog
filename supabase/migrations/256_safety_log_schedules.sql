-- =====================================================
-- 256: Safety Log Schedules — cadence & notification tracking
-- Stores per log_type × location cadence settings and
-- tracks when the last notification was sent.
-- =====================================================

CREATE TABLE IF NOT EXISTS safety_log_schedules (
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
  cadence       TEXT NOT NULL DEFAULT 'none' CHECK (cadence IN ('monthly', 'quarterly', 'biannual', 'annual', 'none')),
  last_completed_at TIMESTAMPTZ,
  last_notified_at  TIMESTAMPTZ,
  notify_roles  TEXT[] DEFAULT '{manager,admin,super_admin,hr_admin,sup_admin}',
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(log_type, location)
);

-- Index for cron lookups
CREATE INDEX IF NOT EXISTS idx_safety_log_schedules_cadence
  ON safety_log_schedules (cadence) WHERE cadence != 'none';

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_safety_log_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_safety_log_schedules_updated_at ON safety_log_schedules;
CREATE TRIGGER trg_safety_log_schedules_updated_at
  BEFORE UPDATE ON safety_log_schedules
  FOR EACH ROW EXECUTE FUNCTION update_safety_log_schedules_updated_at();

-- RLS
ALTER TABLE safety_log_schedules ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read schedules
CREATE POLICY "safety_log_schedules_select_all"
  ON safety_log_schedules FOR SELECT TO authenticated
  USING (true);

-- Managers+ can insert/update schedules
CREATE POLICY "safety_log_schedules_insert_managers"
  ON safety_log_schedules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

CREATE POLICY "safety_log_schedules_update_managers"
  ON safety_log_schedules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

CREATE POLICY "safety_log_schedules_delete_admins"
  ON safety_log_schedules FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON safety_log_schedules TO authenticated;

-- Seed all 36 combinations with 'none' cadence so the UI has rows to update
INSERT INTO safety_log_schedules (log_type, location, cadence)
SELECT lt.key, loc.key, 'none'
FROM (VALUES
  ('training_attendance'), ('injury_illness'), ('incident_near_miss'),
  ('hazard_assessment'), ('safety_inspection'), ('fire_emergency_drill'),
  ('sharps_injury'), ('zoonotic_bite_report'), ('radiation_dosimetry'),
  ('equipment_maintenance'), ('safety_meeting'), ('emergency_contacts')
) AS lt(key)
CROSS JOIN (VALUES ('venice'), ('sherman_oaks'), ('van_nuys')) AS loc(key)
ON CONFLICT (log_type, location) DO NOTHING;

COMMENT ON TABLE safety_log_schedules IS 'Tracks required cadence for each safety log type per location. Used by cron to send reminder notifications to managers/admins when a log is overdue.';
