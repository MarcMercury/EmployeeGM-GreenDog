-- ============================================================
-- Activate Skill & Development agents
-- 
-- These agents were seeded as 'paused' and never activated.
-- The cron dispatcher only runs agents with status = 'active',
-- which is why Skill Scout never discovered skills and
-- Role Mapper never assigned skills to positions.
--
-- Activating:
--   - skill_scout:  Discovers new vet-industry skills via AI
--   - role_mapper:  Maps skills → positions with proficiency levels
--   - gap_analyzer: Computes employee skill gaps (SQL-only, no AI cost)
--   - mentor_matchmaker: Pairs mentors with mentees (SQL-only, no AI cost)
--   - course_architect: Designs training for skill gaps
-- ============================================================

UPDATE agent_registry
SET status = 'active'
WHERE agent_id IN (
  'skill_scout',
  'role_mapper',
  'gap_analyzer',
  'mentor_matchmaker',
  'course_architect'
)
AND status = 'paused';

-- Also activate the supervisor agent so it can auto-approve proposals
UPDATE agent_registry
SET status = 'active'
WHERE agent_id = 'supervisor_agent'
AND status = 'paused';
