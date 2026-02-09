-- ============================================================
-- Seed: AI Agent Registry — Phase 1 (Skill & Development Cluster)
-- Populates agent_registry with the initial set of agents.
-- All agents start PAUSED — enable one at a time.
-- ============================================================

INSERT INTO agent_registry (agent_id, display_name, cluster, description, status, schedule_cron, daily_token_budget, config)
VALUES
  -- Phase 1: Skill & Development Cluster
  (
    'skill_scout',
    'Skill Scout',
    'skill_dev',
    'Discovers new veterinary industry skills via AI and proposes additions to the skill library. Rotates through skill categories daily.',
    'paused',
    '0 6 * * *',         -- Daily at 6am UTC
    10000,
    '{"lastCategoryIndex": -1}'::jsonb
  ),
  (
    'role_mapper',
    'Role Mapper',
    'skill_dev',
    'Maps skills to job positions with recommended proficiency levels. Processes one position per run, rotating through all positions.',
    'paused',
    '30 6 * * *',        -- Daily at 6:30am UTC (after Skill Scout)
    10000,
    '{"lastPositionIndex": -1}'::jsonb
  ),
  (
    'gap_analyzer',
    'Gap Analyzer',
    'skill_dev',
    'Compares every employee''s current skills against their role expectations and computes skill gap reports. Pure SQL — no AI cost.',
    'paused',
    '0 7 * * *',         -- Daily at 7am UTC (after Role Mapper)
    0,                    -- No tokens needed (SQL only)
    '{}'::jsonb
  ),
  (
    'course_architect',
    'Course Architect',
    'skill_dev',
    'Designs training courses, quizzes, and lesson plans for L1-L2 skill gaps. Generates up to 3 courses per run for human review.',
    'paused',
    '0 8 * * 1',         -- Mondays at 8am UTC (weekly, after gaps computed)
    30000,
    '{}'::jsonb
  ),
  (
    'mentor_matchmaker',
    'Mentor Matchmaker',
    'skill_dev',
    'Pairs high-skill employees (L4-L5) with those who have skill gaps for mentorship. Pure SQL matching — no AI cost.',
    'paused',
    '0 8 * * 2',         -- Tuesdays at 8am UTC
    0,                    -- No tokens needed (SQL only)
    '{}'::jsonb
  )
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget;

-- Phase 2: Operations & HR Cluster
INSERT INTO agent_registry (agent_id, display_name, cluster, description, status, schedule_cron, daily_token_budget, config)
VALUES
  (
    'hr_auditor',
    'HR Auditor',
    'ops_hr',
    'Reviews employee profiles for completeness across 12 data rules and flags missing information.',
    'paused',
    '0 7 * * *',
    0,
    '{}'::jsonb
  ),
  (
    'schedule_planner',
    'Schedule Planner',
    'ops_hr',
    'Auto-generates weekly draft schedules per location using AI. Rotates through locations each run.',
    'paused',
    '0 6 * * 0',
    20000,
    '{"lastLocationIndex": -1}'::jsonb
  ),
  (
    'attendance_monitor',
    'Attendance Monitor',
    'ops_hr',
    'Computes 90-day reliability scores for all employees. Flags poor attendance and no-show patterns.',
    'paused',
    '0 7 30 * * *',
    0,
    '{}'::jsonb
  ),
  (
    'payroll_watchdog',
    'Payroll Watchdog',
    'ops_hr',
    'Monitors time entries for anomalies: missing clock-outs, excessive hours, overtime risk, duplicates.',
    'paused',
    '0 9 * * *',
    0,
    '{}'::jsonb
  ),
  (
    'compliance_tracker',
    'Compliance Tracker',
    'ops_hr',
    'Monitors credential expiry, license renewals, CE credits, and required training completion.',
    'paused',
    '0 8 * * *',
    0,
    '{}'::jsonb
  )
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget;

-- Phase 3: Engagement & Growth Cluster
INSERT INTO agent_registry (agent_id, display_name, cluster, description, status, schedule_cron, daily_token_budget, config)
VALUES
  (
    'personal_coach',
    'Personal Coach',
    'engagement',
    'Sends daily personalized nudges to each employee based on goals, skill gaps, training progress, and achievements.',
    'paused',
    '0 14 * * 1-5',
    20000,
    '{"lastEmployeeOffset": 0}'::jsonb
  ),
  (
    'review_orchestrator',
    'Review Orchestrator',
    'engagement',
    'Automates performance review lifecycle — sends reminders, tracks completion, drafts AI summaries.',
    'paused',
    '0 9 * * 1',
    10000,
    '{}'::jsonb
  ),
  (
    'engagement_pulse',
    'Engagement Pulse',
    'engagement',
    'Computes weekly engagement scores from login, training, goal, and achievement activity. Flags declining employees.',
    'paused',
    '0 10 * * 1',
    0,
    '{}'::jsonb
  ),
  (
    'referral_intelligence',
    'Referral Intelligence',
    'engagement',
    'Analyzes referral partner data weekly — identifies inactive partners, outreach priorities, and trend insights.',
    'paused',
    '0 11 * * 1',
    10000,
    '{}'::jsonb
  )
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget;

-- Phase 4: Orchestration
INSERT INTO agent_registry (agent_id, display_name, cluster, description, status, schedule_cron, daily_token_budget, config)
VALUES
  (
    'supervisor_agent',
    'Supervisor Agent',
    'orchestration',
    'Oversees all agents — auto-approves low-risk proposals, routes medium/high-risk to humans, monitors agent health and budget.',
    'paused',
    '*/5 * * * *',
    5000,
    '{}'::jsonb
  )
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cluster = EXCLUDED.cluster,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  schedule_cron = EXCLUDED.schedule_cron,
  daily_token_budget = EXCLUDED.daily_token_budget;
