-- =====================================================
-- PARTNER EVENTS & ENHANCED NOTES SYSTEM
-- Migration: 081_partner_events_signed_notes.sql
-- Description: 
--   - Create partner_events junction table for many-to-many with marketing_events
--   - Enhance partner_notes with author initials for signed notes
--   - Add additional partner tracking fields
-- =====================================================

-- =====================================================
-- 1. PARTNER EVENTS JUNCTION TABLE
-- Links partners to marketing events with participation details
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.marketing_events(id) ON DELETE SET NULL,
  -- For historical events not in marketing_events table
  event_name TEXT,
  event_date DATE,
  -- Participation details
  participation_role TEXT DEFAULT 'attendee' CHECK (participation_role IN (
    'attendee', 'sponsor', 'vendor', 'rescue', 'food_vendor', 
    'entertainment', 'donor', 'volunteer', 'host', 'speaker', 'exhibitor'
  )),
  booth_size TEXT,
  booth_location TEXT,
  -- Status
  is_confirmed BOOLEAN DEFAULT false,
  confirmation_date TIMESTAMPTZ,
  -- Notes
  notes TEXT,
  -- Tracking
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate entries for events in marketing_events table
  UNIQUE(partner_id, event_id)
);

-- Partial unique index for historical events (event_name when event_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_events_name_unique 
ON public.partner_events(partner_id, event_name) 
WHERE event_id IS NULL;

ALTER TABLE public.partner_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_events_view" ON public.partner_events;
DROP POLICY IF EXISTS "partner_events_admin_all" ON public.partner_events;

CREATE POLICY "partner_events_view" ON public.partner_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_events_admin_all" ON public.partner_events
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_partner_events_partner_id ON public.partner_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_events_event_id ON public.partner_events(event_id);
CREATE INDEX IF NOT EXISTS idx_partner_events_event_date ON public.partner_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_partner_events_role ON public.partner_events(participation_role);

GRANT ALL ON public.partner_events TO authenticated;

COMMENT ON TABLE public.partner_events IS 'Junction table linking partners to marketing events with participation details';
COMMENT ON COLUMN public.partner_events.event_name IS 'For historical events not in marketing_events table (e.g., 24 PetChella)';
COMMENT ON COLUMN public.partner_events.participation_role IS 'Role of the partner at the event';

-- =====================================================
-- 2. ENHANCE PARTNER NOTES WITH AUTHOR INITIALS
-- =====================================================

-- Add author_initials column if not exists
ALTER TABLE public.partner_notes 
ADD COLUMN IF NOT EXISTS author_initials TEXT;

-- Add edited tracking
ALTER TABLE public.partner_notes 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS edited_by_initials TEXT;

-- Add note category for better organization
ALTER TABLE public.partner_notes 
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.partner_notes.author_initials IS 'Initials of the user who created the note (e.g., JD for John Doe)';
COMMENT ON COLUMN public.partner_notes.edited_by_initials IS 'Initials of the user who last edited the note';

-- =====================================================
-- 3. ENHANCE REFERRAL PARTNERS WITH ADDITIONAL FIELDS
-- =====================================================

-- Add total referrals tracking
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS total_referrals_ytd INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals_all_time INTEGER DEFAULT 0;

-- Add relationship health score (0-100)
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS relationship_score INTEGER DEFAULT 50 CHECK (relationship_score >= 0 AND relationship_score <= 100);

-- Add preferred contact time
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT;

-- Add social media handles
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add billing/payment tracking for sponsors
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'pending', 'overdue', 'waived', NULL)),
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add organization details
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS organization_type TEXT,
ADD COLUMN IF NOT EXISTS employee_count TEXT CHECK (employee_count IN ('1-5', '6-20', '21-50', '51-200', '200+', NULL));

-- Create index for relationship score
CREATE INDEX IF NOT EXISTS idx_referral_partners_relationship_score ON public.referral_partners(relationship_score);
CREATE INDEX IF NOT EXISTS idx_referral_partners_partner_type ON public.referral_partners(partner_type);

-- =====================================================
-- 4. FUNCTION TO AUTO-POPULATE AUTHOR INITIALS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_initials(profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  initials TEXT;
BEGIN
  SELECT 
    UPPER(
      COALESCE(LEFT(first_name, 1), '') || 
      COALESCE(LEFT(last_name, 1), '')
    )
  INTO initials
  FROM public.profiles
  WHERE id = profile_id;
  
  RETURN COALESCE(NULLIF(initials, ''), 'SY'); -- Default to 'SY' for System
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to auto-populate author initials on partner_notes insert
CREATE OR REPLACE FUNCTION public.set_partner_note_initials()
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

DROP TRIGGER IF EXISTS trigger_set_partner_note_initials ON public.partner_notes;

CREATE TRIGGER trigger_set_partner_note_initials
  BEFORE INSERT ON public.partner_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_note_initials();

-- Trigger for update to set edited initials
CREATE OR REPLACE FUNCTION public.set_partner_note_edited_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content <> OLD.content THEN
    NEW.edited_at := NOW();
    IF NEW.edited_by IS NOT NULL THEN
      NEW.edited_by_initials := public.get_user_initials(NEW.edited_by);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_partner_note_edited_initials ON public.partner_notes;

CREATE TRIGGER trigger_set_partner_note_edited_initials
  BEFORE UPDATE ON public.partner_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_note_edited_initials();

-- =====================================================
-- 5. MIGRATE EXISTING EVENTS_ATTENDED DATA TO JUNCTION TABLE
-- =====================================================

-- Migrate existing events_attended array data to partner_events table
DO $$
DECLARE
  partner_rec RECORD;
  event_name TEXT;
BEGIN
  FOR partner_rec IN 
    SELECT id, events_attended, is_confirmed, booth_size, partner_type
    FROM public.referral_partners 
    WHERE events_attended IS NOT NULL AND array_length(events_attended, 1) > 0
  LOOP
    FOREACH event_name IN ARRAY partner_rec.events_attended
    LOOP
      -- Map partner_type to participation_role
      INSERT INTO public.partner_events (
        partner_id, 
        event_name,
        participation_role,
        is_confirmed,
        booth_size,
        created_at
      ) VALUES (
        partner_rec.id,
        event_name,
        CASE partner_rec.partner_type
          WHEN 'rescue' THEN 'rescue'
          WHEN 'sponsor' THEN 'sponsor'
          WHEN 'vendor' THEN 'vendor'
          WHEN 'donor' THEN 'donor'
          WHEN 'food_beverage' THEN 'food_vendor'
          WHEN 'entertainment' THEN 'entertainment'
          ELSE 'attendee'
        END,
        partner_rec.is_confirmed,
        partner_rec.booth_size,
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 6. VIEW FOR PARTNER EVENT HISTORY
-- =====================================================

CREATE OR REPLACE VIEW public.partner_event_history AS
SELECT 
  pe.id,
  pe.partner_id,
  rp.name AS partner_name,
  rp.partner_type,
  pe.event_id,
  COALESCE(me.name, pe.event_name) AS event_name,
  COALESCE(me.event_date, pe.event_date) AS event_date,
  me.location AS event_location,
  pe.participation_role,
  pe.booth_size,
  pe.booth_location,
  pe.is_confirmed,
  pe.confirmation_date,
  pe.notes,
  pe.created_at
FROM public.partner_events pe
JOIN public.referral_partners rp ON rp.id = pe.partner_id
LEFT JOIN public.marketing_events me ON me.id = pe.event_id
ORDER BY COALESCE(me.event_date, pe.event_date) DESC;

GRANT SELECT ON public.partner_event_history TO authenticated;

-- =====================================================
-- 7. VIEW FOR PARTNER DETAILS WITH STATS
-- =====================================================

CREATE OR REPLACE VIEW public.partner_details AS
SELECT 
  rp.*,
  -- Event stats
  (SELECT COUNT(*) FROM public.partner_events pe WHERE pe.partner_id = rp.id) AS total_events,
  (SELECT COUNT(*) FROM public.partner_events pe WHERE pe.partner_id = rp.id AND pe.is_confirmed = true) AS confirmed_events,
  -- Note stats
  (SELECT COUNT(*) FROM public.partner_notes pn WHERE pn.partner_id = rp.id) AS total_notes,
  (SELECT MAX(created_at) FROM public.partner_notes pn WHERE pn.partner_id = rp.id) AS last_note_date,
  -- Contact visit stats
  (SELECT COUNT(*) FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id) AS total_visits,
  (SELECT MAX(visit_date) FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id) AS last_visit,
  -- Days since last contact calculation
  CASE 
    WHEN rp.last_contact_date IS NOT NULL 
    THEN EXTRACT(DAY FROM NOW() - rp.last_contact_date::timestamp)::INTEGER
    ELSE NULL
  END AS days_since_contact,
  -- Contact urgency flag
  CASE 
    WHEN rp.last_contact_date IS NULL THEN 'never_contacted'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '90 days' THEN 'overdue'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '60 days' THEN 'needs_attention'
    WHEN NOW() - rp.last_contact_date::timestamp > INTERVAL '30 days' THEN 'upcoming'
    ELSE 'recent'
  END AS contact_status
FROM public.referral_partners rp;

GRANT SELECT ON public.partner_details TO authenticated;

-- =====================================================
-- End of Migration
-- =====================================================
