-- =====================================================
-- Fix: Attendance Monitor Invalid Cron Schedule
-- Date: 2026-02-22
-- Description: The original seed had '0 7 30 * * *' (6 fields, invalid).
--              The dispatcher only supports 5-field cron. Correcting to
--              '30 7 * * *' (daily at 7:30 AM UTC).
-- =====================================================

UPDATE agent_registry
SET schedule_cron = '30 7 * * *',
    updated_at = NOW()
WHERE agent_id = 'attendance_monitor'
  AND schedule_cron = '0 7 30 * * *';
