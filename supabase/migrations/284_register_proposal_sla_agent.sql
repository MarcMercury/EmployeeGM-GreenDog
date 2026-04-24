-- =====================================================
-- MIGRATION: Register Proposal SLA Agent
-- Date: 2026-04-24
-- Description: Registers proposal_sla agent that watches for stuck
--              pending proposals and auto-expires past-due ones.
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
  'proposal_sla',
  'Proposal SLA Monitor',
  'orchestration',
  'Closes the loop on the proposal/approval lifecycle. Flags pending proposals past their SLA and auto-expires those past expires_at.',
  'active',
  '37 */3 * * *',
  500,
  jsonb_build_object(
    'pending_warn_hours', 72,
    'auto_expire', true,
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

SELECT 'Agent registered: proposal_sla' AS status;
