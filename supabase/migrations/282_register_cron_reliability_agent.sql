-- =====================================================
-- MIGRATION: Register Cron Reliability Agent
-- Date: 2026-04-24
-- Description: Registers cron_reliability agent for scheduled-run health monitoring.
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
  'cron_reliability',
  'Cron Reliability Monitor',
  'orchestration',
  'Monitors scheduled agent health, flags stale runs and elevated error rates, and generates reliability health proposals.',
  'active',
  '17 * * * *',
  2000,
  jsonb_build_object(
    'staleHours', 48,
    'errorWindowHours', 24,
    'errorWarnThreshold', 5,
    'autoApproveHealthReports', true
  )
)
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  cluster = EXCLUDED.cluster,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget,
  config = EXCLUDED.config,
  updated_at = now();

SELECT 'Agent registered: cron_reliability' AS status;
