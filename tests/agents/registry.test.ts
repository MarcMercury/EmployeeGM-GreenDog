import { describe, it, expect } from 'vitest'
import { getRegisteredAgentIds } from '../../server/utils/agents/handlers'

/**
 * Registry sanity check — guards against accidental deletion of agents
 * the rest of the system depends on (cron schedules, supervisor lists,
 * health metrics) and against duplicate IDs.
 */
describe('agent handler registry', () => {
  const ids = getRegisteredAgentIds()

  it('registers every expected core agent', () => {
    const required = [
      // Phase 1 — Skill & Development
      'gap_analyzer',
      'skill_scout',
      'role_mapper',
      'mentor_matchmaker',
      'course_architect',
      // Phase 2 — Operations & HR
      'hr_auditor',
      'schedule_planner',
      'attendance_monitor',
      'payroll_watchdog',
      'compliance_tracker',
      // Phase 3 — Engagement & Growth
      'personal_coach',
      'review_orchestrator',
      'engagement_pulse',
      'referral_intelligence',
      // Marketing
      'market_events_scout',
      // Phase 4 — Orchestration
      'supervisor_agent',
      'cron_reliability',
      'data_freshness',
      'proposal_sla',
      // Phase 5 — System
      'system_monitor',
      // Phase 6 — Access
      'access_reviewer',
    ]

    for (const id of required) {
      expect(ids, `missing agent id "${id}" — was the handler deregistered?`).toContain(id)
    }
  })

  it('contains no duplicate agent ids', () => {
    const uniq = new Set(ids)
    expect(uniq.size).toBe(ids.length)
  })

  it('uses snake_case ids only', () => {
    const bad = ids.filter(id => !/^[a-z][a-z0-9_]*$/.test(id))
    expect(bad).toEqual([])
  })
})
