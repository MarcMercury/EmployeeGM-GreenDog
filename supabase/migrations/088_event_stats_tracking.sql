-- =====================================================
-- EVENT STATS TRACKING
-- Migration: 088_event_stats_tracking.sql
-- Description: Add fields for tracking event performance metrics
--              including visitors, revenue, and inventory used
-- =====================================================

-- Add new columns to marketing_events table
ALTER TABLE public.marketing_events 
ADD COLUMN IF NOT EXISTS visitors_count INTEGER DEFAULT 0;

ALTER TABLE public.marketing_events 
ADD COLUMN IF NOT EXISTS revenue_generated DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.marketing_events 
ADD COLUMN IF NOT EXISTS inventory_used JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_events.visitors_count IS 'Manual count of visitors at the event';
COMMENT ON COLUMN public.marketing_events.revenue_generated IS 'Revenue generated from the event (manual input)';
COMMENT ON COLUMN public.marketing_events.inventory_used IS 'Array of inventory items used: [{item_id, item_name, quantity_used}]';

-- Create index for stats queries
CREATE INDEX IF NOT EXISTS idx_marketing_events_date_stats 
ON public.marketing_events(event_date, visitors_count, revenue_generated);
