-- Migration: 070_medical_partnerships_crm
-- Description: Enhance referral_partners table for comprehensive CRM functionality
-- Adds: priority, tier, goals, targeting logic, timestamped notes, referral tracking

-- =====================================================
-- 1. ADD CRM ENHANCEMENT FIELDS TO REFERRAL_PARTNERS
-- =====================================================

-- Priority and targeting
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze' CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'prospect')),
ADD COLUMN IF NOT EXISTS zone TEXT,  -- Geographic zone (e.g., 'AETNA', 'SO', 'WESTSIDE', 'VENICE')
ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'general' CHECK (clinic_type IN ('general', 'specialty', 'emergency', 'urgent_care', 'mobile', 'shelter', 'corporate', 'independent')),
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'small' CHECK (size IN ('small', 'medium', 'large', 'enterprise'));

-- Goals and objectives
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS monthly_referral_goal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarterly_revenue_goal NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_quarter_revenue NUMERIC(12,2) DEFAULT 0;

-- Targeting and scheduling
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS visit_frequency TEXT DEFAULT 'monthly' CHECK (visit_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed')),
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS preferred_visit_day TEXT CHECK (preferred_visit_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', NULL)),
ADD COLUMN IF NOT EXISTS preferred_visit_time TEXT CHECK (preferred_visit_time IN ('morning', 'midday', 'afternoon', NULL)),
ADD COLUMN IF NOT EXISTS best_contact_person TEXT,
ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_reason TEXT;

-- Agreement and relationship details
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS referral_agreement_type TEXT DEFAULT 'none' CHECK (referral_agreement_type IN ('none', 'informal', 'formal', 'exclusive')),
ADD COLUMN IF NOT EXISTS ce_event_host BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lunch_and_learn_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS drop_off_materials BOOLEAN DEFAULT true;

-- Tags for flexible categorization
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =====================================================
-- 2. PARTNER NOTES TABLE (Timestamped Notes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'visit', 'call', 'email', 'meeting', 'issue', 'opportunity', 'goal')),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "partner_notes_view" ON public.partner_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_notes_admin_all" ON public.partner_notes
  FOR ALL USING (public.is_admin());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_partner_notes_partner_id ON public.partner_notes(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notes_created_at ON public.partner_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_notes_is_pinned ON public.partner_notes(is_pinned);

-- Grant permissions
GRANT ALL ON public.partner_notes TO authenticated;

-- =====================================================
-- 3. PARTNER GOALS TABLE (Tracking objectives)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('referral', 'revenue', 'relationship', 'event', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.partner_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "partner_goals_view" ON public.partner_goals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_goals_admin_all" ON public.partner_goals
  FOR ALL USING (public.is_admin());

-- Index
CREATE INDEX IF NOT EXISTS idx_partner_goals_partner_id ON public.partner_goals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_goals_status ON public.partner_goals(status);

-- Grant permissions
GRANT ALL ON public.partner_goals TO authenticated;

-- =====================================================
-- 4. ADD INDEXES FOR CRM QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_referral_partners_priority ON public.referral_partners(priority);
CREATE INDEX IF NOT EXISTS idx_referral_partners_tier ON public.referral_partners(tier);
CREATE INDEX IF NOT EXISTS idx_referral_partners_zone ON public.referral_partners(zone);
CREATE INDEX IF NOT EXISTS idx_referral_partners_needs_followup ON public.referral_partners(needs_followup);
CREATE INDEX IF NOT EXISTS idx_referral_partners_next_followup ON public.referral_partners(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_referral_partners_last_visit ON public.referral_partners(last_visit_date);

-- =====================================================
-- 5. UPDATE TRIGGER FOR LAST VISIT DATE
-- =====================================================

-- Function to update last_visit_date when a visit log is added
CREATE OR REPLACE FUNCTION public.update_partner_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.referral_partners
  SET last_visit_date = NEW.visit_date,
      last_contact_date = NEW.visit_date,
      needs_followup = false,
      updated_at = NOW()
  WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_partner_last_visit ON public.partner_visit_logs;

CREATE TRIGGER trigger_update_partner_last_visit
  AFTER INSERT ON public.partner_visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partner_last_visit();

-- =====================================================
-- 6. FUNCTION TO CHECK OVERDUE PARTNERS
-- =====================================================

-- Function to identify partners needing follow-up based on visit frequency
CREATE OR REPLACE FUNCTION public.get_overdue_partners()
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  days_overdue INTEGER,
  visit_frequency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.id,
    rp.name,
    CASE 
      WHEN rp.visit_frequency = 'weekly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 7
      WHEN rp.visit_frequency = 'biweekly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 14
      WHEN rp.visit_frequency = 'monthly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 30
      WHEN rp.visit_frequency = 'quarterly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 90
      ELSE 0
    END::INTEGER as days_overdue,
    rp.visit_frequency
  FROM public.referral_partners rp
  WHERE rp.status = 'active'
    AND rp.visit_frequency != 'as_needed'
    AND (
      (rp.visit_frequency = 'weekly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 7)
      OR (rp.visit_frequency = 'biweekly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 14)
      OR (rp.visit_frequency = 'monthly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 30)
      OR (rp.visit_frequency = 'quarterly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 90)
    )
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON COLUMN public.referral_partners.priority IS 'Partner priority level for outreach (high, medium, low)';
COMMENT ON COLUMN public.referral_partners.tier IS 'Partnership tier based on value (platinum, gold, silver, bronze, prospect)';
COMMENT ON COLUMN public.referral_partners.zone IS 'Geographic zone for territory management';
COMMENT ON COLUMN public.referral_partners.clinic_type IS 'Type of veterinary practice';
COMMENT ON COLUMN public.referral_partners.visit_frequency IS 'How often this partner should be visited';
COMMENT ON COLUMN public.referral_partners.needs_followup IS 'Flag indicating partner needs immediate follow-up';
COMMENT ON TABLE public.partner_notes IS 'Timestamped notes for tracking partner interactions';
COMMENT ON TABLE public.partner_goals IS 'Goals and objectives for each partner relationship';
