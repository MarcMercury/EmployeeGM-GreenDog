-- =====================================================
-- Revenue Line Items for Row-Level Duplicate Detection
-- =====================================================
-- Stores individual revenue CSV rows so re-uploads only
-- add genuinely new records (same date + clinic + vet +
-- client + animal + amount → duplicate, skip).
-- Partner totals are recalculated from these line items.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_revenue_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  transaction_date TEXT NOT NULL,
  csv_clinic_name TEXT NOT NULL,
  referring_vet TEXT,
  client_name TEXT,
  animal_name TEXT,
  division TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  dedup_hash TEXT NOT NULL,
  upload_id UUID REFERENCES public.referral_sync_history(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on dedup_hash enforces row-level uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_line_items_dedup
  ON public.referral_revenue_line_items (dedup_hash);

-- Fast lookup by partner for total recalculation
CREATE INDEX IF NOT EXISTS idx_revenue_line_items_partner
  ON public.referral_revenue_line_items (partner_id);

-- RLS
ALTER TABLE public.referral_revenue_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_line_items_admin_all" ON public.referral_revenue_line_items;
CREATE POLICY "revenue_line_items_admin_all" ON public.referral_revenue_line_items
  FOR ALL USING (public.is_admin());

GRANT ALL ON public.referral_revenue_line_items TO authenticated;

-- Drop the file-level unique constraint on content_hash
-- (row-level dedup replaces file-level blocking)
DROP INDEX IF EXISTS idx_referral_sync_hash_unique;

COMMENT ON TABLE public.referral_revenue_line_items IS 'Individual revenue CSV rows for row-level duplicate detection';
