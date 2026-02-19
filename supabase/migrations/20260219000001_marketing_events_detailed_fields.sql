-- =====================================================
-- MIGRATION: Marketing Events - Detailed Fields Enhancement
-- Date: 2026-02-19
-- Description: Adds comprehensive fields for event planning including
--              hosted_by, event_cost, expectations, physical_setup,
--              communication_log, and vendor_status
-- =====================================================

-- Add new columns to marketing_events table
ALTER TABLE public.marketing_events
  ADD COLUMN IF NOT EXISTS hosted_by TEXT,
  ADD COLUMN IF NOT EXISTS event_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS expectations TEXT,
  ADD COLUMN IF NOT EXISTS physical_setup TEXT,
  ADD COLUMN IF NOT EXISTS communication_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vendor_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived'));

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_events.hosted_by IS 'Organization or company hosting/organizing the event';
COMMENT ON COLUMN public.marketing_events.event_cost IS 'Cost to participate in event (booth fee, registration, etc.)';
COMMENT ON COLUMN public.marketing_events.expectations IS 'Description of our involvement and what is expected of us (sponsor, vendor, services provided, etc.)';
COMMENT ON COLUMN public.marketing_events.physical_setup IS 'Details about physical setup: what we bring vs what is provided (tent, tables, chairs, etc.)';
COMMENT ON COLUMN public.marketing_events.communication_log IS 'Array of communication entries: [{date, type, contact, summary, notes}]';
COMMENT ON COLUMN public.marketing_events.vendor_status IS 'Vendor registration status (e.g., "Registration not open", "Registered", "Waitlist", etc.)';
COMMENT ON COLUMN public.marketing_events.payment_date IS 'Date when payment was finalized';
COMMENT ON COLUMN public.marketing_events.payment_status IS 'Payment status: pending, paid, refunded, waived';

-- Create index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_marketing_events_payment_status ON public.marketing_events(payment_status);
