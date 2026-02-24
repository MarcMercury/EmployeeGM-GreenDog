-- =====================================================
-- MIGRATION: Marketing Events Visual Categories
-- Adds color coding system for calendar visualization
-- =====================================================

-- Add event_category column with color-coded types
ALTER TABLE public.marketing_events
  ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'general' 
  CHECK (event_category IN (
    'clinic_hosted',          -- GREEN: CE or Client facing event at clinic
    'offsite_tent',           -- ORANGE: Third party event with tent setup
    'offsite_street_team',    -- RED: Third party, street team only, no tent
    'donation_flyers',        -- PINK: Just donation or flyers left
    'considering',            -- AMBER: Event being considered
    'awareness_day',          -- GREY: National Days/Weeks/Months, Vet conferences
    'major_holiday',          -- YELLOW: Major holidays
    'general'                 -- DEFAULT: General events
  ));

-- Create function to auto-assign category based on event type and name
CREATE OR REPLACE FUNCTION auto_assign_event_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-detect awareness days/weeks/months from event name
  IF NEW.name ~* '(national|international|world).*(day|week|month)' 
     OR NEW.name ~* 'awareness (day|week|month)'
     OR NEW.name ~* 'appreciation (day|week|month)'
     OR NEW.event_type = 'other' AND NEW.status = 'planned'
  THEN
    NEW.event_category := 'awareness_day';
  
  -- Auto-detect major holidays
  ELSIF NEW.name ~* '(christmas|thanksgiving|new year|easter|halloween|memorial day|labor day|independence day|veterans day)'
  THEN
    NEW.event_category := 'major_holiday';
  
  -- Map event types to categories (if not already set)
  ELSIF NEW.event_category IS NULL OR NEW.event_category = 'general' THEN
    CASE NEW.event_type
      WHEN 'ce_event' THEN NEW.event_category := 'clinic_hosted';
      WHEN 'health_fair' THEN NEW.event_category := 'clinic_hosted';
      WHEN 'open_house' THEN NEW.event_category := 'clinic_hosted';
      WHEN 'street_fair' THEN NEW.event_category := 'offsite_tent';
      WHEN 'pet_expo' THEN NEW.event_category := 'offsite_tent';
      WHEN 'community_outreach' THEN NEW.event_category := 'offsite_street_team';
      WHEN 'adoption_event' THEN NEW.event_category := 'offsite_tent';
      ELSE NEW.event_category := 'general';
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign category on insert/update
DROP TRIGGER IF EXISTS trigger_auto_assign_event_category ON public.marketing_events;
CREATE TRIGGER trigger_auto_assign_event_category
  BEFORE INSERT OR UPDATE ON public.marketing_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_event_category();

-- Backfill existing events with categories
-- Awareness days/weeks/months
UPDATE public.marketing_events
SET event_category = 'awareness_day'
WHERE (
  name ~* '(national|international|world).*(day|week|month)'
  OR name ~* 'awareness (day|week|month)'
  OR name ~* 'appreciation (day|week|month)'
  OR (event_type = 'other' AND status = 'planned')
);

-- Major holidays  
UPDATE public.marketing_events
SET event_category = 'major_holiday'
WHERE name ~* '(christmas|thanksgiving|new year|easter|halloween|memorial day|labor day|independence day|veterans day)';

-- CE/Clinic events
UPDATE public.marketing_events
SET event_category = 'clinic_hosted'
WHERE event_type IN ('ce_event', 'health_fair', 'open_house')
  AND event_category IS NULL;

-- Offsite with tent
UPDATE public.marketing_events
SET event_category = 'offsite_tent'
WHERE event_type IN ('street_fair', 'pet_expo', 'adoption_event')
  AND event_category IS NULL;

-- Community outreach (street team)
UPDATE public.marketing_events
SET event_category = 'offsite_street_team'
WHERE event_type = 'community_outreach'
  AND event_category IS NULL;

-- Comments
COMMENT ON COLUMN public.marketing_events.event_category IS 'Visual category for color coding: clinic_hosted (green), offsite_tent (orange), offsite_street_team (red), donation_flyers (pink), considering (amber), awareness_day (grey), major_holiday (yellow)';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_marketing_events_category ON public.marketing_events(event_category);
