-- Migration: 055_partner_contacts_and_notes
-- Description: Add partner contacts table, enhance notes functionality, add revenue tracking

-- =====================================================
-- 1. PARTNER CONTACTS TABLE
-- =====================================================
-- For tracking multiple key people at each partner clinic

CREATE TABLE IF NOT EXISTS public.partner_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  relationship_notes TEXT,
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'in_person')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner contacts
CREATE POLICY "partner_contacts_view" ON public.partner_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_contacts_admin_all" ON public.partner_contacts
  FOR ALL USING (public.is_admin());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_partner_contacts_partner_id ON public.partner_contacts(partner_id);

-- Grant permissions
GRANT ALL ON public.partner_contacts TO authenticated;

-- =====================================================
-- 2. ENSURE PARTNER VISIT LOGS HAS RLS POLICIES
-- =====================================================

-- Check and enable RLS
ALTER TABLE public.partner_visit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "partner_visit_logs_view" ON public.partner_visit_logs;
DROP POLICY IF EXISTS "partner_visit_logs_admin_all" ON public.partner_visit_logs;

-- Create policies
CREATE POLICY "partner_visit_logs_view" ON public.partner_visit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_visit_logs_admin_all" ON public.partner_visit_logs
  FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT ALL ON public.partner_visit_logs TO authenticated;

-- =====================================================
-- 3. ADD REVENUE TRACKING FIELDS
-- =====================================================

-- Add revenue tracking fields to referral_partners
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS revenue_ytd NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_last_year NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_monthly_revenue NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- 4. CREATE TRIGGER TO UPDATE LAST CONTACT DATE
-- =====================================================

-- Function to update last_contact_date when a visit log is added
CREATE OR REPLACE FUNCTION public.update_partner_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.referral_partners
  SET last_contact_date = NEW.visit_date,
      updated_at = NOW()
  WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_partner_last_contact ON public.partner_visit_logs;

CREATE TRIGGER trigger_update_partner_last_contact
  AFTER INSERT ON public.partner_visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partner_last_contact();

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.partner_contacts IS 'Key contacts at partner clinics/organizations';
COMMENT ON COLUMN public.partner_contacts.is_primary IS 'Whether this is the primary contact for the partner';
COMMENT ON COLUMN public.referral_partners.revenue_ytd IS 'Year-to-date revenue from this partner';
COMMENT ON COLUMN public.referral_partners.revenue_last_year IS 'Total revenue from last calendar year';
COMMENT ON COLUMN public.referral_partners.average_monthly_revenue IS 'Average monthly revenue over relationship';
