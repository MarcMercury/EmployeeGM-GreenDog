-- Migration: Add ROI tracking columns to marketing_campaigns
-- Description: Adds spend_actual, goal_clients, leads_generated, clients_converted for campaign ROI tracking

-- Add new columns if they don't exist
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS spend_actual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_clients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clients_converted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0;

-- Update status check constraint to support more statuses
ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_status_check;
ALTER TABLE public.marketing_campaigns 
ADD CONSTRAINT marketing_campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'Planning', 'Active', 'Paused', 'Completed'));

-- Grant permissions
GRANT SELECT ON public.marketing_campaigns TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;

COMMENT ON TABLE public.marketing_campaigns IS 'Marketing campaigns with ROI tracking for events and leads';
