-- ============================================================================
-- MIGRATION 212: Appointment Value Integration
-- Ties together the four analytics report types so the dashboard can answer
-- "what is the average value of an appointment type, by month?"
--
--   1. CONTACTS            -> ezyvet_crm_contacts        (existing)
--   2. INVOICES            -> invoice_lines              (existing)
--   3. Appointment Details -> appointment_data           (existing, source='appointment_status')
--   4. Appointment Types   -> appointment_type_summary   (NEW, this migration)
--
-- To correlate an appointment (Owner = "Last, First" + Animal + Date) to its
-- invoices we need the client LAST name on the invoice rows — the invoice
-- import previously stored only the first name. This migration adds that column
-- plus the new type-summary table that holds the pre-aggregated Appointment
-- Type report (Type, Count, Avg Time, Total Time) keyed by month + location.
-- ============================================================================

-- ── 1. Invoice last name (needed for appointment ↔ invoice correlation) ─────
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS client_last_name TEXT;

CREATE INDEX IF NOT EXISTS idx_inv_lines_client_last_name
  ON invoice_lines (lower(client_last_name));

CREATE INDEX IF NOT EXISTS idx_inv_lines_pet_name
  ON invoice_lines (lower(pet_name));

-- ── 2. Appointment Type summary report ──────────────────────────────────────
-- The Appointment Type export is pre-aggregated: one row per appointment type
-- with the period's count and timing. The export itself carries NO location or
-- month, so those are supplied by the uploader (derived from the file name /
-- the chosen filters) and stored here for monthly, per-location analysis.
CREATE TABLE IF NOT EXISTS appointment_type_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope (supplied at upload time)
  location_name TEXT,                       -- e.g. "Green Dog - Venice"
  period_month DATE NOT NULL,               -- first day of the reporting month (e.g. 2026-01-01)

  -- Type metrics (from the report)
  type_name TEXT NOT NULL,                  -- e.g. "Urgent Care (New)", "EX - Recheck"
  appointment_count INT NOT NULL DEFAULT 0, -- "Count"
  avg_time_mins NUMERIC(10,2) DEFAULT 0,    -- "Average Time(Mins)"
  total_time_mins NUMERIC(12,2) DEFAULT 0,  -- "Total Time(Mins)"

  -- Metadata
  source TEXT DEFAULT 'appointment_type',
  batch_id UUID,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- One row per type per month per location (re-upload replaces via upsert)
  UNIQUE (period_month, location_name, type_name)
);

CREATE INDEX IF NOT EXISTS idx_appt_type_summary_month
  ON appointment_type_summary (period_month);
CREATE INDEX IF NOT EXISTS idx_appt_type_summary_location
  ON appointment_type_summary (location_name);
CREATE INDEX IF NOT EXISTS idx_appt_type_summary_type
  ON appointment_type_summary (type_name);

-- ── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE appointment_type_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_type_summary_admin" ON appointment_type_summary;
CREATE POLICY "appointment_type_summary_admin" ON appointment_type_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

-- Writes happen through the service-role API (upload/clear endpoints), which
-- bypasses RLS, so reads are governed by the admin policy above.
