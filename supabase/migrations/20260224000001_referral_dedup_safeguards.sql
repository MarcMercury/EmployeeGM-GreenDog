-- Migration: 20260224000001_referral_dedup_safeguards
-- Description: Add duplicate detection, date-range tracking, and data-source
--              provenance to referral stats uploads to prevent double-counting.

-- =====================================================
-- 1. REFERRAL_SYNC_HISTORY – add content_hash for dedup
-- =====================================================
ALTER TABLE public.referral_sync_history
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS report_type TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'csv_upload';

COMMENT ON COLUMN public.referral_sync_history.content_hash IS 'SHA-256 hash of the uploaded CSV content for duplicate detection';
COMMENT ON COLUMN public.referral_sync_history.report_type IS 'Type of report: revenue or statistics';
COMMENT ON COLUMN public.referral_sync_history.data_source IS 'Origin of the data: csv_upload or ezyvet_sync';

-- Partial unique index: one hash per report_type prevents re-upload of identical file
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_sync_hash_unique
  ON public.referral_sync_history (content_hash, report_type)
  WHERE content_hash IS NOT NULL;

-- =====================================================
-- 2. REFERRAL_PARTNERS – add last_data_source column
-- =====================================================
ALTER TABLE public.referral_partners
  ADD COLUMN IF NOT EXISTS last_data_source TEXT DEFAULT 'manual';

COMMENT ON COLUMN public.referral_partners.last_data_source IS 'Which system last wrote the stats: csv_upload, ezyvet_sync, or manual';
