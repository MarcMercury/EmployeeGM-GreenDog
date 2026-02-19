-- =============================================================================
-- Migration: Add scraped event tracking to marketing_events
-- Adds fields to track the source of scraped events and allow filtering
-- =============================================================================

-- Add columns to track event sourcing
ALTER TABLE public.marketing_events
ADD COLUMN IF NOT EXISTS is_auto_scraped BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_events.is_auto_scraped IS 'Whether the event was automatically scraped from an external source';
COMMENT ON COLUMN public.marketing_events.source_url IS 'URL of the source website where the event was scraped from';
COMMENT ON COLUMN public.marketing_events.source_name IS 'Name of the event source (e.g., Venice Chamber of Commerce)';
COMMENT ON COLUMN public.marketing_events.external_links IS 'Array of external links related to the event: [{title, url, description}]';

-- Create index for filtering auto-scraped events
CREATE INDEX IF NOT EXISTS idx_marketing_events_auto_scraped ON public.marketing_events(is_auto_scraped, source_name);

-- Create index for source URL filtering
CREATE INDEX IF NOT EXISTS idx_marketing_events_source_url ON public.marketing_events(source_url);
