-- Migration: Add revisit tracking columns to candidate_interviews
-- Supports the Candidate Revisit feature on the Recruiting page

ALTER TABLE candidate_interviews
  ADD COLUMN IF NOT EXISTS revisit_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisit_reason text;

-- Index for efficient revisit queries
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_revisit
  ON candidate_interviews (revisit_eligible)
  WHERE revisit_eligible = true;

COMMENT ON COLUMN candidate_interviews.revisit_eligible
  IS 'Flag set by interviewers to indicate candidate is worth reconsidering for future openings';
COMMENT ON COLUMN candidate_interviews.revisit_reason
  IS 'Explanation for why this candidate should be revisited';
