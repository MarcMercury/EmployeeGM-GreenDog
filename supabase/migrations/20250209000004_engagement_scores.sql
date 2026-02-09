-- ============================================================
-- Migration: Employee Engagement Scores
-- Persists weekly engagement scores from the Engagement Pulse
-- agent for historical trending and reporting.
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  previous_score INTEGER CHECK (previous_score >= 0 AND previous_score <= 100),
  decline_percent INTEGER,
  activity_breakdown JSONB DEFAULT '{}',
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One score per employee per week
CREATE UNIQUE INDEX idx_engagement_scores_emp_week
  ON employee_engagement_scores(employee_id, week_start);

-- Fast lookups for flagged employees
CREATE INDEX idx_engagement_scores_flagged
  ON employee_engagement_scores(flagged, week_start DESC)
  WHERE flagged = TRUE;

-- Fast lookups for trending (last N weeks for an employee)
CREATE INDEX idx_engagement_scores_trend
  ON employee_engagement_scores(employee_id, week_start DESC);

-- Weekly aggregate view for dashboard
CREATE INDEX idx_engagement_scores_week
  ON employee_engagement_scores(week_start DESC, score);

-- RLS
ALTER TABLE employee_engagement_scores ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY engagement_scores_service_all
  ON employee_engagement_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated: read own scores via employees table
CREATE POLICY engagement_scores_read_own
  ON employee_engagement_scores
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN profiles p ON p.id = e.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Managers: read their direct reports' scores
CREATE POLICY engagement_scores_read_reports
  ON employee_engagement_scores
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.manager_employee_id IN (
        SELECT me.id FROM employees me
        JOIN profiles mp ON mp.id = me.profile_id
        WHERE mp.auth_user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE employee_engagement_scores IS 'Weekly engagement scores computed by the Engagement Pulse agent. Tracks login, training, goal, and achievement activity per employee.';
