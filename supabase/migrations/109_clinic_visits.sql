-- =====================================================
-- CLINIC VISITS - Quick Visit Logging System
-- Migration: 109_clinic_visits.sql
-- Description:
--   - Create clinic_visits table for liaison/marketing reps to log clinic visits
--   - Mobile-optimized quick visit logging with voice-to-text notes
--   - Links to referral_partners and profiles
-- =====================================================

-- =====================================================
-- 1. CLINIC VISITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clinic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User who logged the visit
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Partner/Clinic reference
  partner_id UUID REFERENCES public.referral_partners(id) ON DELETE SET NULL,
  clinic_name TEXT NOT NULL, -- Store name for display even if partner is deleted
  
  -- Visit details
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spoke_to TEXT, -- Who they spoke with at the clinic
  
  -- Items discussed (array of predefined topics)
  items_discussed TEXT[] DEFAULT '{}',
  
  -- Follow-up scheduling
  next_visit_date DATE, -- Optional next planned visit
  
  -- Notes (supports voice-to-text input)
  visit_notes TEXT,
  
  -- Metadata
  logged_via TEXT DEFAULT 'web' CHECK (logged_via IN ('web', 'mobile', 'api')),
  is_archived BOOLEAN DEFAULT false
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clinic_visits_user_id ON public.clinic_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_profile_id ON public.clinic_visits(profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_partner_id ON public.clinic_visits(partner_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_visit_date ON public.clinic_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_created_at ON public.clinic_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_clinic_name ON public.clinic_visits(clinic_name);

-- GIN index for items_discussed array searches
CREATE INDEX IF NOT EXISTS idx_clinic_visits_items_discussed ON public.clinic_visits USING GIN(items_discussed);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "clinic_visits_select" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_insert" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_update" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_delete" ON public.clinic_visits;
DROP POLICY IF EXISTS "clinic_visits_admin_all" ON public.clinic_visits;

-- Authenticated users can view all visits (for team visibility)
CREATE POLICY "clinic_visits_select" ON public.clinic_visits
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert their own visits
CREATE POLICY "clinic_visits_insert" ON public.clinic_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own visits, admins can update any
CREATE POLICY "clinic_visits_update" ON public.clinic_visits
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- Only admins can delete visits
CREATE POLICY "clinic_visits_delete" ON public.clinic_visits
  FOR DELETE USING (public.is_admin());

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_clinic_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_clinic_visits_updated_at ON public.clinic_visits;
CREATE TRIGGER trigger_clinic_visits_updated_at
  BEFORE UPDATE ON public.clinic_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_clinic_visits_updated_at();

-- =====================================================
-- 5. FUNCTION TO UPDATE PARTNER LAST VISIT DATE
-- When a clinic visit is logged, update the partner's last_visit_date
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_partner_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if partner_id is set
  IF NEW.partner_id IS NOT NULL THEN
    UPDATE public.referral_partners
    SET 
      last_visit_date = NEW.visit_date,
      updated_at = NOW()
    WHERE id = NEW.partner_id
      AND (last_visit_date IS NULL OR last_visit_date < NEW.visit_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_partner_last_visit ON public.clinic_visits;
CREATE TRIGGER trigger_update_partner_last_visit
  AFTER INSERT OR UPDATE ON public.clinic_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_partner_last_visit();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.clinic_visits TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE public.clinic_visits IS 'Quick visit logging for liaison/marketing reps visiting partner clinics';
COMMENT ON COLUMN public.clinic_visits.user_id IS 'The auth user who logged the visit';
COMMENT ON COLUMN public.clinic_visits.profile_id IS 'Reference to the profile for display name access';
COMMENT ON COLUMN public.clinic_visits.partner_id IS 'Optional link to referral_partners table';
COMMENT ON COLUMN public.clinic_visits.clinic_name IS 'Clinic name stored for display even if partner is unlinked';
COMMENT ON COLUMN public.clinic_visits.items_discussed IS 'Array of predefined topics discussed during the visit';
COMMENT ON COLUMN public.clinic_visits.visit_notes IS 'Free-form notes, supports voice-to-text input';
COMMENT ON COLUMN public.clinic_visits.logged_via IS 'How the visit was logged (web, mobile, api)';
