-- =====================================================
-- VALIDATION: Marketing Events Scout Agent Setup
-- Run this to verify all components are in place
-- =====================================================

-- Check 1: Agent is registered
SELECT 
  agent_id,
  display_name,
  cluster,
  status,
  daily_token_budget,
  config->>'location' as location
FROM public.agent_registry
WHERE agent_id = 'market_events_scout';

-- Check 2: Agent has no recent error runs
SELECT 
  id,
  agent_id,
  status,
  started_at,
  error_message
FROM public.agent_runs
WHERE agent_id = 'market_events_scout'
ORDER BY started_at DESC
LIMIT 5;

-- Check 3: Count pending event discovery proposals
SELECT 
  COUNT(*) as pending_count,
  agent_id
FROM public.agent_proposals
WHERE proposal_type = 'event_discovery'
  AND status = 'pending'
GROUP BY agent_id;

-- Check 4: Look at made and auto_approved event proposals
SELECT 
  COUNT(*) as count,
  status,
  proposal_type
FROM public.agent_proposals
WHERE proposal_type = 'event_discovery'
GROUP BY status, proposal_type;

-- Check 5: See events that were added from proposals
SELECT 
  me.name,
  me.event_date,
  me.location,
  me.status,
  me.created_at
FROM public.marketing_events me
WHERE me.notes LIKE '%Discovered event%'
  OR me.notes LIKE '%web search%'
ORDER BY me.created_at DESC
LIMIT 10;

-- Check 6: Validate marketing_events table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'marketing_events'
  AND column_name IN (
    'hosted_by',
    'event_cost',
    'expectations',
    'physical_setup',
    'communication_log',
    'vendor_status',
    'payment_date',
    'payment_status'
  )
ORDER BY ordinal_position;

-- =====================================================
-- Summary Query: Ready for Production?
-- =====================================================

-- All systems go if all queries above return data:
-- 1. Agent is registered and active (or paused, can be activated)
-- 2. No recent error runs
-- 3. Agent can create proposals (may be 0 if not run yet)
-- 4. New columns present in marketing_events table
-- 5. Events being created from proposals (may be empty on first run)
