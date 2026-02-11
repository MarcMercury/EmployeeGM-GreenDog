-- =====================================================
-- Migration 204: Seed Access Policy Reviewer Agent
-- Description: Register the access_reviewer agent in agent_registry
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
)
VALUES (
  'access_reviewer',
  'Access Policy Reviewer',
  'admin',
  'Continuously audits the application''s access control posture. Scans page_definitions vs actual app routes to find unregistered pages, checks role-to-page access completeness, detects RLS gaps on DB tables, flags over-permissive entries, and monitors role distribution. Generates AI-powered executive summaries with prioritized action items.',
  'paused',
  '0 5 * * 1',  -- Every Monday at 5 AM
  5000,
  '{"scan_rls": true, "alert_on_missing_pages": true, "max_findings_per_run": 50}'::jsonb
)
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();
