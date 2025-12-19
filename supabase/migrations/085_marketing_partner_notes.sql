-- =====================================================
-- MARKETING PARTNER NOTES & RELATIONSHIP ENHANCEMENT
-- Migration: 085_marketing_partner_notes.sql
-- Description: 
--   - Create marketing_partner_notes table for timestamped notes with author initials
--   - Add relationship tracking fields to marketing_partners
--   - Add marketing_partner_contacts table
-- =====================================================

-- =====================================================
-- 1. MARKETING PARTNER NOTES TABLE
-- Timestamped notes with author initials for tracking partner interactions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketing_partner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.marketing_partners(id) ON DELETE CASCADE,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'visit', 'call', 'email', 'meeting', 'issue', 'opportunity', 'goal', 'follow_up')),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  -- Author info
  created_by UUID REFERENCES public.profiles(id),
  created_by_name TEXT,
  author_initials TEXT,
  -- Edit tracking
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES public.profiles(id),
  edited_by_initials TEXT,
  -- Category for organization
  category TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_partner_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_partner_notes_view" ON public.marketing_partner_notes;
DROP POLICY IF EXISTS "marketing_partner_notes_admin_all" ON public.marketing_partner_notes;

CREATE POLICY "marketing_partner_notes_view" ON public.marketing_partner_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "marketing_partner_notes_admin_all" ON public.marketing_partner_notes
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_marketing_partner_notes_partner_id ON public.marketing_partner_notes(partner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_partner_notes_created_at ON public.marketing_partner_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_partner_notes_is_pinned ON public.marketing_partner_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_marketing_partner_notes_note_type ON public.marketing_partner_notes(note_type);

GRANT ALL ON public.marketing_partner_notes TO authenticated;

COMMENT ON TABLE public.marketing_partner_notes IS 'Timestamped notes for tracking marketing partner interactions';
COMMENT ON COLUMN public.marketing_partner_notes.author_initials IS 'Initials of the user who created the note (e.g., JD for John Doe)';
COMMENT ON COLUMN public.marketing_partner_notes.edited_by_initials IS 'Initials of the user who last edited the note';

-- =====================================================
-- 2. MARKETING PARTNER CONTACTS TABLE
-- Multiple contacts per partner
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketing_partner_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.marketing_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_partner_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_partner_contacts_view" ON public.marketing_partner_contacts;
DROP POLICY IF EXISTS "marketing_partner_contacts_admin_all" ON public.marketing_partner_contacts;

CREATE POLICY "marketing_partner_contacts_view" ON public.marketing_partner_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "marketing_partner_contacts_admin_all" ON public.marketing_partner_contacts
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_marketing_partner_contacts_partner_id ON public.marketing_partner_contacts(partner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_partner_contacts_is_primary ON public.marketing_partner_contacts(is_primary);

GRANT ALL ON public.marketing_partner_contacts TO authenticated;

-- =====================================================
-- 3. ENHANCE MARKETING PARTNERS WITH RELATIONSHIP FIELDS
-- =====================================================

-- Relationship tracking
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS relationship_score INTEGER DEFAULT 50 CHECK (relationship_score >= 0 AND relationship_score <= 100);

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS relationship_status TEXT CHECK (relationship_status IN ('prospect', 'developing', 'active', 'strong', 'at_risk', 'dormant', NULL));

-- Visit/Contact tracking
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS last_visit_date DATE;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS next_followup_date DATE;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT false;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS visit_frequency TEXT DEFAULT 'quarterly' CHECK (visit_frequency IN ('weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'annually', 'as-needed', NULL));

-- Preferred contact info
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS preferred_visit_day TEXT;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS best_contact_person TEXT;

-- Partnership value tracking
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS partnership_value TEXT CHECK (partnership_value IN ('strategic', 'high', 'medium', 'low', 'potential', NULL));

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low', NULL));

-- Sponsorship/Payment tracking (for vendors, chambers)
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'pending', 'overdue', 'waived', NULL));

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_marketing_partners_relationship_score ON public.marketing_partners(relationship_score);
CREATE INDEX IF NOT EXISTS idx_marketing_partners_priority ON public.marketing_partners(priority);
CREATE INDEX IF NOT EXISTS idx_marketing_partners_needs_followup ON public.marketing_partners(needs_followup);
CREATE INDEX IF NOT EXISTS idx_marketing_partners_next_followup ON public.marketing_partners(next_followup_date);

-- =====================================================
-- 4. TRIGGERS FOR AUTO-POPULATING AUTHOR INITIALS
-- =====================================================

-- Trigger to auto-populate author initials on marketing_partner_notes insert
CREATE OR REPLACE FUNCTION public.set_marketing_partner_note_initials()
RETURNS TRIGGER AS $$
BEGIN
  -- Set author initials if not provided
  IF NEW.author_initials IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.author_initials := public.get_user_initials(NEW.created_by);
  END IF;
  
  -- Set created_by_name if not provided
  IF NEW.created_by_name IS NULL AND NEW.created_by IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name)
    INTO NEW.created_by_name
    FROM public.profiles
    WHERE id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_marketing_partner_note_initials ON public.marketing_partner_notes;

CREATE TRIGGER trigger_set_marketing_partner_note_initials
  BEFORE INSERT ON public.marketing_partner_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_marketing_partner_note_initials();

-- Trigger for update to set edited initials
CREATE OR REPLACE FUNCTION public.set_marketing_partner_note_edited_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content <> OLD.content THEN
    NEW.edited_at := NOW();
    NEW.updated_at := NOW();
    IF NEW.edited_by IS NOT NULL THEN
      NEW.edited_by_initials := public.get_user_initials(NEW.edited_by);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_marketing_partner_note_edited_initials ON public.marketing_partner_notes;

CREATE TRIGGER trigger_set_marketing_partner_note_edited_initials
  BEFORE UPDATE ON public.marketing_partner_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_marketing_partner_note_edited_initials();

-- =====================================================
-- 5. UPDATE TIMESTAMP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_marketing_partner_notes_updated_at ON public.marketing_partner_notes;
CREATE TRIGGER update_marketing_partner_notes_updated_at
  BEFORE UPDATE ON public.marketing_partner_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketing_partner_contacts_updated_at ON public.marketing_partner_contacts;
CREATE TRIGGER update_marketing_partner_contacts_updated_at
  BEFORE UPDATE ON public.marketing_partner_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
