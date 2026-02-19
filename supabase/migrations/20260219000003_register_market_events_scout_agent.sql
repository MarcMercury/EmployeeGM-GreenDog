-- =====================================================
-- MIGRATION: Register Marketing Events Scout Agent
-- Date: 2026-02-19
-- Description: Registers the market_events_scout agent for discovering local events
-- =====================================================

INSERT INTO public.agent_registry (
  agent_id,
  display_name,
  cluster,
  description,
  status,
  schedule_cron,
  daily_token_budget,
  config
) VALUES (
  'market_events_scout',
  'Marketing Events Scout',
  'engagement',
  'Discovers local pet-related and community events via web search. Automatically adds discovered events to the marketing calendar as proposed events with pre-filled details.',
  'paused',
  '0 6 * * 0',  -- Every Sunday at 6 AM
  10000,
  jsonb_build_object(
    'location', 'Los Angeles, California',
    'keywords', jsonb_build_array(
      'pet festival',
      'holiday walk',
      'street fair',
      'animal event',
      'pet parade',
      'veterinary conference',
      'pet adoption',
      'dog friendly',
      'animal rescue',
      'pet expo',
      'farmers market',
      'holiday market',
      'community fair',
      'carnival',
      'festival'
    ),
    'eventTypes', jsonb_build_array(
      'street_fair',
      'pet_expo',
      'community_outreach',
      'fundraiser'
    ),
    'autoApproveThreshold', 0.8,
    'maxProposals', 20,
    'description', 'Discovers local pet and community events to expand marketing reach'
  )
)
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  cluster = EXCLUDED.cluster,
  config = EXCLUDED.config;

-- Record creation
SELECT 'Agent registered: market_events_scout' AS status;
