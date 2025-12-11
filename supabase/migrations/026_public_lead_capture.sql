-- Migration: Add public lead capture fields to marketing_leads
-- Description: Adds first_name, last_name, company, interest_level, and source_event_id for public lead capture forms

-- Add new columns for enhanced lead capture
ALTER TABLE marketing_leads 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS interest_level TEXT DEFAULT 'learning_more' CHECK (interest_level IN ('just_curious', 'learning_more', 'very_interested', 'ready_to_buy'));

-- Add source_event_id as an alias reference (keeping event_id for backwards compatibility)
ALTER TABLE marketing_leads 
ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES marketing_events(id) ON DELETE SET NULL;

-- Create index for source_event_id lookups
CREATE INDEX IF NOT EXISTS idx_marketing_leads_source_event ON marketing_leads(source_event_id);

-- Update lead_name to be computed from first_name + last_name if not set
-- This maintains backwards compatibility
CREATE OR REPLACE FUNCTION set_lead_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_name IS NULL OR NEW.lead_name = '' THEN
    NEW.lead_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_leads_set_name
  BEFORE INSERT ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION set_lead_name_from_parts();

-- IMPORTANT: Public insert policy for lead capture forms
-- This allows unauthenticated users to submit leads through the public form
CREATE POLICY "Public can insert leads"
ON marketing_leads
FOR INSERT
WITH CHECK (true);

-- Comment for documentation
COMMENT ON COLUMN marketing_leads.source_event_id IS 'The event that sourced this lead (from QR code/public form)';
COMMENT ON COLUMN marketing_leads.interest_level IS 'Self-reported interest level from lead capture form';
