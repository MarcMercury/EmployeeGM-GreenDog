-- Seed system_monitor agent into agent_registry
-- This agent watches over System Settings – Roles, Positions,
-- Company details, DB health, and Integrations.

INSERT INTO agent_registry (agent_id, display_name, cluster, description, status, schedule_cron, daily_token_budget, config)
VALUES
  (
    'system_monitor',
    'System Monitor',
    'orchestration',
    'Monitors System Settings page health — checks company completeness, roles, positions, departments, locations, integrations connectivity, and database health. Creates proposals for any issues found.',
    'active',
    '0 6 * * *',
    0,
    '{"categories": ["company", "roles", "positions", "departments", "locations", "integrations", "database"]}'::jsonb
  )
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget;
