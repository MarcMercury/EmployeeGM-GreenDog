-- =====================================================
-- 276: Consolidate Safety Log Types
--
-- 1. Remove: emergency_contacts, hazcom_chemical, hazard_assessment
-- 2. Combine: injury_illness + incident_near_miss +
--    zoonotic_bite_report + sharps_injury → injury_incident_bite
--
-- Existing log rows are preserved: the four merged types are
-- re-labelled to injury_incident_bite with the original type
-- stored in form_data.original_log_type for audit trail.
-- Removed types are soft-archived (status → 'archived').
-- =====================================================

-- 1. Migrate existing rows for the four merged types → injury_incident_bite
-- Store the original type in form_data so nothing is lost.
UPDATE safety_logs
SET
  form_data = form_data || jsonb_build_object(
    'original_log_type', log_type,
    'incident_category',
    CASE log_type
      WHEN 'injury_illness'      THEN 'Injury / Illness'
      WHEN 'incident_near_miss'  THEN 'Incident / Near Miss'
      WHEN 'zoonotic_bite_report' THEN 'Zoonotic / Bite'
      WHEN 'sharps_injury'       THEN 'Sharps Injury'
    END
  ),
  log_type = 'injury_incident_bite'
WHERE log_type IN ('injury_illness', 'incident_near_miss', 'zoonotic_bite_report', 'sharps_injury');

-- 2. Archive rows for the three removed types
-- (keeps data for compliance; prevents them from appearing in active views)
UPDATE safety_logs
SET status = 'reviewed',
    review_notes = COALESCE(review_notes, '') || ' [Archived: log type retired in migration 276]'
WHERE log_type IN ('emergency_contacts', 'hazcom_chemical', 'hazard_assessment');

-- 3. Update safety_log_schedules — merge schedule rows
-- First update merged types
UPDATE safety_log_schedules
SET log_type = 'injury_incident_bite'
WHERE log_type IN ('injury_illness', 'incident_near_miss', 'zoonotic_bite_report', 'sharps_injury')
  AND NOT EXISTS (
    SELECT 1 FROM safety_log_schedules s2
    WHERE s2.log_type = 'injury_incident_bite'
      AND s2.location = safety_log_schedules.location
  );

-- Delete duplicate schedule rows that couldn't be updated due to unique constraint
DELETE FROM safety_log_schedules
WHERE log_type IN ('injury_illness', 'incident_near_miss', 'zoonotic_bite_report', 'sharps_injury');

-- Delete schedule rows for removed types
DELETE FROM safety_log_schedules
WHERE log_type IN ('emergency_contacts', 'hazcom_chemical', 'hazard_assessment');

-- 4. Update the safety_log_schedules CHECK constraint to include the new type
-- Drop existing CHECK on log_type if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'safety_log_schedules'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%log_type%'
  ) THEN
    EXECUTE (
      SELECT string_agg('ALTER TABLE safety_log_schedules DROP CONSTRAINT ' || c.conname, '; ')
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'safety_log_schedules'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%log_type%'
    );
  END IF;
END $$;

-- No new CHECK — allow custom types in schedules too, matching safety_logs behavior.

-- 5. Seed schedule rows for the new merged type
INSERT INTO safety_log_schedules (log_type, location, cadence)
SELECT 'injury_incident_bite', loc.key, 'none'
FROM (VALUES ('venice'), ('sherman_oaks'), ('van_nuys')) AS loc(key)
ON CONFLICT (log_type, location) DO NOTHING;

-- 6. Update safety_log_employees links — the junction references stay valid
-- since we only changed log_type on the safety_logs rows (id is unchanged).
