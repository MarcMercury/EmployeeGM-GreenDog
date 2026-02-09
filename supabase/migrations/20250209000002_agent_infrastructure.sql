-- ============================================================
-- Phase 0: AI Agent Workforce Infrastructure
-- Creates the foundational tables for the autonomous agent system.
-- ============================================================

-- 1. Agent Registry — defines every agent and its config
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,               -- 'skill_scout', 'hr_auditor', etc.
  display_name TEXT NOT NULL,
  cluster TEXT NOT NULL,                        -- 'skill_dev', 'ops_hr', 'engagement', 'admin'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'paused'         -- active, paused, disabled
    CHECK (status IN ('active', 'paused', 'disabled')),
  schedule_cron TEXT,                           -- cron expression e.g. '0 6 * * *'
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT                          -- success, partial, error
    CHECK (last_run_status IS NULL OR last_run_status IN ('success', 'partial', 'error')),
  last_run_duration_ms INTEGER,
  daily_token_budget INTEGER NOT NULL DEFAULT 50000,
  daily_tokens_used INTEGER NOT NULL DEFAULT 0,
  budget_reset_at TIMESTAMPTZ DEFAULT now(),
  config JSONB NOT NULL DEFAULT '{}',           -- agent-specific settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Agent Proposals — the universal output queue
CREATE TABLE IF NOT EXISTS agent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_registry(agent_id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL,                  -- 'new_skill', 'skill_role_mapping', 'course_draft', etc.
  title TEXT NOT NULL,
  summary TEXT,
  detail JSONB NOT NULL DEFAULT '{}',           -- structured payload per proposal type
  target_employee_id UUID,                      -- optional FK to employees
  target_entity_type TEXT,                      -- 'skill_library', 'training_courses', 'shifts', etc.
  target_entity_id UUID,                        -- optional FK to the entity
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'auto_approved', 'approved', 'rejected', 'applied', 'expired')),
  reviewed_by UUID,                             -- FK to profiles.id of reviewer
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  applied_at TIMESTAMPTZ,                       -- when the proposal was actually applied
  expires_at TIMESTAMPTZ,                       -- auto-expire stale proposals
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_proposals_agent_status ON agent_proposals(agent_id, status);
CREATE INDEX idx_agent_proposals_status_created ON agent_proposals(status, created_at DESC);
CREATE INDEX idx_agent_proposals_employee ON agent_proposals(target_employee_id) WHERE target_employee_id IS NOT NULL;
CREATE INDEX idx_agent_proposals_type ON agent_proposals(proposal_type, status);

-- 3. Agent Runs — execution history and token tracking
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_registry(agent_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'error')),
  trigger_type TEXT NOT NULL                    -- 'cron', 'event', 'manual', 'agent'
    CHECK (trigger_type IN ('cron', 'event', 'manual', 'agent')),
  trigger_source TEXT,                          -- cron job name, event type, requesting agent
  proposals_created INTEGER NOT NULL DEFAULT 0,
  proposals_auto_approved INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id, started_at DESC);
CREATE INDEX idx_agent_runs_status ON agent_runs(status) WHERE status = 'running';

-- 4. Role Skill Expectations — maps positions to expected skill levels
CREATE TABLE IF NOT EXISTS role_skill_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position_id UUID NOT NULL,               -- FK to job_positions
  skill_id UUID NOT NULL,                      -- FK to skill_library
  expected_level INTEGER NOT NULL DEFAULT 1
    CHECK (expected_level BETWEEN 1 AND 5),
  importance TEXT NOT NULL DEFAULT 'recommended'
    CHECK (importance IN ('required', 'recommended', 'optional')),
  source TEXT NOT NULL DEFAULT 'manual'         -- 'manual', 'agent'
    CHECK (source IN ('manual', 'agent')),
  agent_proposal_id UUID REFERENCES agent_proposals(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_position_id, skill_id)
);

CREATE INDEX idx_role_skill_exp_position ON role_skill_expectations(job_position_id);
CREATE INDEX idx_role_skill_exp_skill ON role_skill_expectations(skill_id);

-- 5. Employee Skill Gaps — computed gap analysis per employee
CREATE TABLE IF NOT EXISTS employee_skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,                   -- FK to employees
  skill_id UUID NOT NULL,                      -- FK to skill_library
  skill_name TEXT NOT NULL,                    -- denormalized for fast reads
  category TEXT,                               -- denormalized
  current_level INTEGER NOT NULL DEFAULT 0,    -- 0 = skill not yet acquired
  expected_level INTEGER NOT NULL,
  gap INTEGER NOT NULL,                        -- expected_level - current_level
  importance TEXT NOT NULL DEFAULT 'recommended',
  has_course_available BOOLEAN NOT NULL DEFAULT false,
  has_mentor_available BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, skill_id)
);

CREATE INDEX idx_skill_gaps_employee ON employee_skill_gaps(employee_id);
CREATE INDEX idx_skill_gaps_gap ON employee_skill_gaps(gap DESC) WHERE gap > 0;
CREATE INDEX idx_skill_gaps_skill ON employee_skill_gaps(skill_id);

-- 6. Add source tracking to skill_library (if column doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_library' AND column_name = 'source'
  ) THEN
    ALTER TABLE skill_library ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_library' AND column_name = 'agent_proposal_id'
  ) THEN
    ALTER TABLE skill_library ADD COLUMN agent_proposal_id UUID;
  END IF;
END $$;

-- 7. Add source tracking to training_courses (if column doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'source'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'agent_proposal_id'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN agent_proposal_id UUID;
  END IF;
END $$;

-- 8. RLS Policies — agent tables are server-only (service role)
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skill_gaps ENABLE ROW LEVEL SECURITY;

-- Service role (used by server) gets full access
CREATE POLICY "service_role_agent_registry" ON agent_registry
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_agent_proposals" ON agent_proposals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_agent_runs" ON agent_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_role_skill_exp" ON role_skill_expectations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_skill_gaps" ON employee_skill_gaps
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read proposals and gaps (for dashboard visibility)
CREATE POLICY "authenticated_read_proposals" ON agent_proposals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_registry" ON agent_registry
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_runs" ON agent_runs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_role_skill_exp" ON role_skill_expectations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_skill_gaps" ON employee_skill_gaps
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9. Updated_at trigger for agent_registry
CREATE OR REPLACE FUNCTION update_agent_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_registry_updated_at
  BEFORE UPDATE ON agent_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_registry_updated_at();

-- 10. Auto-expire stale proposals (can be called by cleanup cron)
CREATE OR REPLACE FUNCTION expire_stale_agent_proposals()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE agent_proposals
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
