-- =====================================================
-- MIGRATION: Register Data Freshness Agent
-- Date: 2026-04-24
-- Description: Registers data_freshness agent to monitor external data sources
--              (ezyVet, Slack, marketing, invoices, referrals) for staleness.
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
  'data_freshness',
  'Data Freshness Monitor',
  'orchestration',
  'Checks configured data source tables for staleness and raises health_report proposals when rows age beyond thresholds.',
  'active',
  '23 */2 * * *',
  1000,
  jsonb_build_object(
    'autoApproveHealthReports', true,
    'sources', jsonb_build_array(
      jsonb_build_object('key', 'ezyvet_sync', 'table', 'ezyvet_api_sync_log',
                         'timestamp_column', 'created_at', 'max_age_hours', 24,
                         'label', 'ezyVet API sync'),
      jsonb_build_object('key', 'slack_sync', 'table', 'slack_sync_logs',
                         'timestamp_column', 'created_at', 'max_age_hours', 24,
                         'label', 'Slack sync'),
      jsonb_build_object('key', 'marketing_events', 'table', 'marketing_events',
                         'timestamp_column', 'updated_at', 'max_age_hours', 336,
                         'label', 'Marketing events'),
      jsonb_build_object('key', 'invoice_lines', 'table', 'invoice_lines',
                         'timestamp_column', 'created_at', 'max_age_hours', 720,
                         'label', 'Invoice lines'),
      jsonb_build_object('key', 'referral_revenue', 'table', 'referral_revenue_line_items',
                         'timestamp_column', 'created_at', 'max_age_hours', 1440,
                         'label', 'Referral revenue')
    )
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

SELECT 'Agent registered: data_freshness' AS status;
