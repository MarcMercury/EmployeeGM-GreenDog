-- =====================================================
-- MIGRATION 031: Marketing Events Expansion
-- Adds event types, supplies, and additional details
-- =====================================================

-- Add new columns to marketing_events table
ALTER TABLE public.marketing_events
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'general' CHECK (event_type IN ('general', 'ce_event', 'street_fair', 'open_house', 'adoption_event', 'community_outreach', 'health_fair', 'school_visit', 'pet_expo', 'fundraiser', 'other')),
  ADD COLUMN IF NOT EXISTS supplies_needed TEXT,
  ADD COLUMN IF NOT EXISTS expected_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS registration_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_link TEXT,
  ADD COLUMN IF NOT EXISTS post_event_notes TEXT,
  ADD COLUMN IF NOT EXISTS actual_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS leads_collected INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_events.event_type IS 'Type of event: CE, street fair, open house, adoption, etc.';
COMMENT ON COLUMN public.marketing_events.supplies_needed IS 'List of supplies/materials needed for the event';
COMMENT ON COLUMN public.marketing_events.expected_attendance IS 'Estimated number of attendees';
COMMENT ON COLUMN public.marketing_events.notes IS 'Internal planning notes and special instructions';
COMMENT ON COLUMN public.marketing_events.contact_name IS 'Primary contact person for the event venue/organizer';
COMMENT ON COLUMN public.marketing_events.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN public.marketing_events.contact_email IS 'Contact email address';
COMMENT ON COLUMN public.marketing_events.registration_required IS 'Whether registration is required for attendees';
COMMENT ON COLUMN public.marketing_events.registration_link IS 'URL for event registration';
COMMENT ON COLUMN public.marketing_events.post_event_notes IS 'Notes captured after the event for follow-up';
COMMENT ON COLUMN public.marketing_events.actual_attendance IS 'Actual number of attendees after event';
COMMENT ON COLUMN public.marketing_events.leads_collected IS 'Number of leads collected at the event';

-- Create index for event type filtering
CREATE INDEX IF NOT EXISTS idx_marketing_events_type ON public.marketing_events(event_type);
