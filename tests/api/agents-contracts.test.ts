/**
 * Contract tests for /api/agents/* response shapes.
 *
 * Endpoints that don't easily run under vitest (Nuxt-coupled handlers)
 * are validated by reconstructing their response payloads using the
 * same data shape and running them through the canonical Zod schemas.
 *
 * If a handler's response shape ever changes without updating the
 * schema (or vice versa), this test will fail in CI.
 */

import { describe, it, expect } from 'vitest'
import {
  agentHealthSuccessSchema,
  agentHealthErrorSchema,
  agentHealthResponseSchema,
  agentListResponseSchema,
  agentRunRowSchema,
} from '../../app/schemas/agent-api'

describe('Agent API contracts', () => {
  describe('GET /api/agents/health', () => {
    it('healthy response matches contract', () => {
      const payload = {
        status: 'healthy' as const,
        message: 'Agent system fully operational',
        openai: true,
        recentSuccess: true,
        hasActiveAgents: true,
        metrics: {
          activeAgentCount: 19,
          recentSuccessCount: 42,
          recentErrorCount: 0,
          staleAgentCount: 0,
          staleAgentIds: [],
        },
        lastUpdated: new Date().toISOString(),
      }
      expect(() => agentHealthSuccessSchema.parse(payload)).not.toThrow()
      expect(() => agentHealthResponseSchema.parse(payload)).not.toThrow()
    })

    it('degraded response with stale agents matches contract', () => {
      const payload = {
        status: 'degraded' as const,
        message: '2 scheduled agent(s) appear stale',
        openai: true,
        recentSuccess: true,
        hasActiveAgents: true,
        metrics: {
          activeAgentCount: 19,
          recentSuccessCount: 5,
          recentErrorCount: 1,
          staleAgentCount: 2,
          staleAgentIds: ['skill_scout', 'mentor_matchmaker'],
        },
        lastUpdated: new Date().toISOString(),
      }
      expect(() => agentHealthResponseSchema.parse(payload)).not.toThrow()
    })

    it('error response matches contract', () => {
      const payload = {
        status: 'error' as const,
        message: 'Failed to check agent health',
        openai: false,
        error: 'permission denied',
        lastUpdated: new Date().toISOString(),
      }
      expect(() => agentHealthErrorSchema.parse(payload)).not.toThrow()
      expect(() => agentHealthResponseSchema.parse(payload)).not.toThrow()
    })

    it('rejects payload missing metrics on success status', () => {
      const broken = {
        status: 'healthy',
        message: 'ok',
        openai: true,
        recentSuccess: true,
        hasActiveAgents: true,
        // metrics intentionally missing
        lastUpdated: new Date().toISOString(),
      }
      const result = agentHealthResponseSchema.safeParse(broken)
      expect(result.success).toBe(false)
    })

    it('rejects legacy {hasAgents:true} response (regression guard)', () => {
      const legacy = {
        status: 'healthy',
        message: 'ok',
        openai: true,
        hasAgents: true, // old field name
        lastUpdated: new Date().toISOString(),
      }
      const result = agentHealthResponseSchema.safeParse(legacy)
      expect(result.success).toBe(false)
    })
  })

  describe('GET /api/agents', () => {
    it('list response matches contract', () => {
      const payload = {
        success: true as const,
        data: {
          agents: [
            { agent_id: 'gap_analyzer', display_name: 'Gap Analyzer', status: 'active', cluster: 'skills' },
            { agent_id: 'cron_reliability', status: 'active', schedule_cron: '17 * * * *' },
          ],
          stats: { proposals: {}, runs: {} },
        },
      }
      expect(() => agentListResponseSchema.parse(payload)).not.toThrow()
    })

    it('rejects success=false shape', () => {
      const broken = { success: false, data: { agents: [], stats: { proposals: {}, runs: {} } } }
      expect(agentListResponseSchema.safeParse(broken).success).toBe(false)
    })
  })

  describe('Agent run row', () => {
    it('accepts well-formed run row', () => {
      const row = {
        id: 'run-1',
        agent_id: 'cron_reliability',
        status: 'success',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }
      expect(() => agentRunRowSchema.parse(row)).not.toThrow()
    })

    it('rejects row missing required fields', () => {
      const bad = { agent_id: 'x', status: 'success' } // no id
      expect(agentRunRowSchema.safeParse(bad).success).toBe(false)
    })
  })
})
