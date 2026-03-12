-- =====================================================
-- Marketing Partner Visits & Enhanced CRM Tracking
-- =====================================================
-- Creates a visit log table for marketing partners (chambers,
-- vendors, rescues, pet businesses, etc.) to track in-person
-- visits, what was dropped off, and what was discussed.
-- Also adds fields for expected visit frequency and overdue tracking.
-- =====================================================

-- =====================================================
-- 1. MARKETING PARTNER VISITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketing_partner_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User who logged the visit
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Partner reference
  partner_id UUID NOT NULL REFERENCES public.marketing_partners(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL, -- Denormalized for display if partner is deleted

  -- Visit details
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spoke_to TEXT, -- Who they spoke with
  visit_type TEXT DEFAULT 'in_person' CHECK (visit_type IN (
    'in_person', 'drop_off', 'phone', 'email', 'event', 'other'
  )),

  -- What was dropped off / delivered
  items_dropped_off TEXT[], -- e.g. ['brochures', 'business_cards', 'flyers', 'swag']

  -- Topics discussed
  items_discussed TEXT[], -- e.g. ['adoption_event', 'partnership', 'referrals', 'social_media']

  -- Follow-up scheduling
  next_visit_date DATE,

  -- Notes
  visit_notes TEXT,

  -- Outcome / next steps
  outcome TEXT,
  next_steps TEXT,

  -- Metadata
  logged_via TEXT DEFAULT 'web' CHECK (logged_via IN ('web', 'mobile', 'api')),
  is_archived BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.marketing_partner_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "marketing_partner_visits_select" ON public.marketing_partner_visits;
DROP POLICY IF EXISTS "marketing_partner_visits_insert" ON public.marketing_partner_visits;
DROP POLICY IF EXISTS "marketing_partner_visits_update" ON public.marketing_partner_visits;
DROP POLICY IF EXISTS "marketing_partner_visits_delete" ON public.marketing_partner_visits;

-- Authenticated users can view all visits (team visibility)
CREATE POLICY "marketing_partner_visits_select" ON public.marketing_partner_visits
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert their own visits
CREATE POLICY "marketing_partner_visits_insert" ON public.marketing_partner_visits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own visits, marketing admins can update any
CREATE POLICY "marketing_partner_visits_update" ON public.marketing_partner_visits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_marketing_admin());

-- Only marketing admins can delete visits
CREATE POLICY "marketing_partner_visits_delete" ON public.marketing_partner_visits
  FOR DELETE TO authenticated
  USING (public.is_marketing_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_visits_partner_id ON public.marketing_partner_visits(partner_id);
CREATE INDEX IF NOT EXISTS idx_mp_visits_user_id ON public.marketing_partner_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_visits_visit_date ON public.marketing_partner_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_mp_visits_visit_type ON public.marketing_partner_visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_mp_visits_items_dropped ON public.marketing_partner_visits USING GIN(items_dropped_off);
CREATE INDEX IF NOT EXISTS idx_mp_visits_items_discussed ON public.marketing_partner_visits USING GIN(items_discussed);

-- Grants
GRANT ALL ON public.marketing_partner_visits TO authenticated;

-- =====================================================
-- 2. ADD ENHANCED TRACKING FIELDS TO MARKETING PARTNERS
-- =====================================================

-- Expected visit frequency in days (for overdue calculation)
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS expected_visit_frequency_days INTEGER;

-- Computed: days since last visit (will be updated by trigger or app logic)
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS days_since_last_visit INTEGER;

-- Visit overdue flag
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS visit_overdue BOOLEAN DEFAULT false;

-- Drop-off materials tracking (what materials this partner accepts)
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS drop_off_materials BOOLEAN DEFAULT false;

-- Materials they accept
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS accepted_materials TEXT[];

-- Last drop-off date
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS last_drop_off_date DATE;

-- Tags for flexible categorization
ALTER TABLE public.marketing_partners
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- =====================================================
-- 3. TRIGGER: Auto-update partner on visit log
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_marketing_partner_on_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the partner's last_visit_date and tracking fields
  UPDATE public.marketing_partners
  SET
    last_visit_date = NEW.visit_date,
    updated_at = NOW(),
    needs_followup = CASE WHEN NEW.next_visit_date IS NOT NULL THEN true ELSE false END,
    next_followup_date = COALESCE(NEW.next_visit_date, next_followup_date),
    last_drop_off_date = CASE
      WHEN NEW.items_dropped_off IS NOT NULL AND array_length(NEW.items_dropped_off, 1) > 0
      THEN NEW.visit_date
      ELSE last_drop_off_date
    END
  WHERE id = NEW.partner_id
    AND (last_visit_date IS NULL OR NEW.visit_date >= last_visit_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_marketing_partner_on_visit ON public.marketing_partner_visits;
CREATE TRIGGER trg_update_marketing_partner_on_visit
  AFTER INSERT ON public.marketing_partner_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_partner_on_visit();

-- =====================================================
-- 4. FUNCTION: Recalculate partner visit metrics
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalculate_marketing_partner_metrics()
RETURNS void AS $$
BEGIN
  UPDATE public.marketing_partners mp
  SET
    days_since_last_visit = CASE
      WHEN mp.last_visit_date IS NOT NULL
      THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer
      ELSE NULL
    END,
    visit_overdue = CASE
      WHEN mp.last_visit_date IS NULL AND mp.expected_visit_frequency_days IS NOT NULL THEN true
      WHEN mp.expected_visit_frequency_days IS NOT NULL
        AND EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > mp.expected_visit_frequency_days
      THEN true
      WHEN mp.visit_frequency IS NOT NULL AND mp.last_visit_date IS NOT NULL THEN
        CASE mp.visit_frequency
          WHEN 'weekly' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 7
          WHEN 'bi-weekly' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 14
          WHEN 'monthly' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 30
          WHEN 'quarterly' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 90
          WHEN 'semi-annually' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 180
          WHEN 'annually' THEN EXTRACT(DAY FROM (NOW() - mp.last_visit_date::timestamp))::integer > 365
          ELSE false
        END
      ELSE false
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.marketing_partner_visits IS 'Visit log for marketing partner drop-ins, calls, and meetings';
COMMENT ON COLUMN public.marketing_partner_visits.items_dropped_off IS 'Materials dropped off during the visit (brochures, cards, flyers, swag)';
COMMENT ON COLUMN public.marketing_partner_visits.items_discussed IS 'Topics discussed during the visit';
COMMENT ON FUNCTION public.recalculate_marketing_partner_metrics IS 'Recalculates days_since_last_visit and visit_overdue for all marketing partners';
