-- =====================================================
-- REFERRAL STATS TRACKING
-- Migration: 084_referral_stats.sql
-- Description: Add columns for tracking referral revenue and visit stats
-- =====================================================

-- Add stats columns to referral_partners
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS total_referrals_all_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_all_time NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_sync_date TIMESTAMPTZ;

-- Add index for reporting queries
CREATE INDEX IF NOT EXISTS idx_referral_partners_revenue ON public.referral_partners(total_revenue_all_time DESC);
CREATE INDEX IF NOT EXISTS idx_referral_partners_referrals ON public.referral_partners(total_referrals_all_time DESC);

-- Create sync history table to track uploads
CREATE TABLE IF NOT EXISTS public.referral_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_range_start DATE,
  date_range_end DATE,
  total_rows_parsed INTEGER DEFAULT 0,
  total_rows_matched INTEGER DEFAULT 0,
  total_rows_skipped INTEGER DEFAULT 0,
  total_revenue_added NUMERIC(12,2) DEFAULT 0,
  uploaded_by UUID REFERENCES public.profiles(id),
  sync_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_sync_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_sync_history_admin_all" ON public.referral_sync_history;
CREATE POLICY "referral_sync_history_admin_all" ON public.referral_sync_history
  FOR ALL USING (public.is_admin());

GRANT ALL ON public.referral_sync_history TO authenticated;

COMMENT ON TABLE public.referral_sync_history IS 'Tracks PDF uploads and sync operations for referral stats';
COMMENT ON COLUMN public.referral_partners.total_referrals_all_time IS 'Total number of referral visits from this partner';
COMMENT ON COLUMN public.referral_partners.total_revenue_all_time IS 'Total revenue generated from this partner referrals';
COMMENT ON COLUMN public.referral_partners.last_sync_date IS 'When stats were last updated from EzyVet report';
