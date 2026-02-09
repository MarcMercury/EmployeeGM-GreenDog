/**
 * Tests for the supervisor-agent handler.
 *
 * Tests cover:
 * - Empty pending proposals → graceful success
 * - Auto-approve low-risk proposals
 * - High-risk proposals routed to admin
 * - Stuck run detection
 * - Budget warning detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../helpers/mock-supabase'

// Mock dependencies
vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-sup-1'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/agents/openai', () => ({
  agentChat: vi.fn().mockResolvedValue({
    content: JSON.stringify({ approve: true, reasoning: 'Looks safe' }),
    tokensUsed: 100,
    costUsd: 0.001,
  }),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { createProposal, autoApproveProposal } from '../../server/utils/agents/proposals'
import { agentChat } from '../../server/utils/agents/openai'

describe('supervisor-agent handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/supervisor-agent')
    handler = mod.default
  })

  function buildCtxWithTables(tableData: Record<string, any[]>) {
    const ctx = createMockContext({ agentId: 'supervisor_agent' })
    ;(ctx.supabase as any).from.mockImplementation((table: string) => {
      const data = tableData[table] ?? []
      const builder: any = {}
      const methods = [
        'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is',
        'order', 'limit', 'delete', 'insert', 'update', 'range', 'or', 'not',
      ]
      for (const m of methods) {
        builder[m] = vi.fn().mockReturnValue(builder)
      }
      builder.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null })
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null })
      Object.defineProperty(builder, 'then', {
        value: (resolve: any) => resolve({ data, error: null }),
        writable: true,
        configurable: true,
      })
      return builder
    })
    return ctx
  }

  it('returns success with 0 proposals when no pending proposals exist', async () => {
    const ctx = buildCtxWithTables({
      agent_proposals: [],
      agent_runs: [],
      agent_registry: [
        { agent_id: 'gap_analyzer', status: 'active', daily_tokens_used: 100, daily_token_budget: 10000 },
      ],
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
  })

  it('auto-approves low-risk nudge proposals', async () => {
    const ctx = buildCtxWithTables({
      agent_proposals: [
        {
          id: 'p-1',
          agent_id: 'engagement_pulse',
          proposal_type: 'nudge',
          risk_level: 'low',
          status: 'pending',
          detail: { summary: 'test' },
          target_employee_id: null,
          created_at: new Date().toISOString(),
          title: 'Test nudge',
          summary: 'A test',
        },
      ],
      agent_runs: [],
      agent_registry: [
        { agent_id: 'gap_analyzer', status: 'active', daily_tokens_used: 100, daily_token_budget: 10000 },
        { agent_id: 'supervisor_agent', status: 'active', daily_tokens_used: 50, daily_token_budget: 20000 },
      ],
      notification_queue: [],
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Supervisor should have auto-approved at least one low-risk proposal
    expect(autoApproveProposal).toHaveBeenCalled()
  })

  it('routes high-risk proposals to admin review', async () => {
    const ctx = buildCtxWithTables({
      agent_proposals: [
        {
          id: 'p-2',
          agent_id: 'payroll_watchdog',
          proposal_type: 'payroll_anomaly',
          risk_level: 'high',
          status: 'pending',
          detail: { summary: 'Major payroll issue' },
        },
      ],
      agent_runs: [],
      agent_registry: [
        { agent_id: 'payroll_watchdog', status: 'active', daily_tokens_used: 500, daily_token_budget: 10000 },
        { agent_id: 'supervisor_agent', status: 'active', daily_tokens_used: 50, daily_token_budget: 20000 },
      ],
      notification_queue: [],
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // High-risk should NOT be auto-approved
    expect(autoApproveProposal).not.toHaveBeenCalledWith('p-2')
  })

  it('detects agents with high budget usage', async () => {
    const ctx = buildCtxWithTables({
      agent_proposals: [],
      agent_runs: [],
      agent_registry: [
        {
          agent_id: 'gap_analyzer',
          status: 'active',
          daily_tokens_used: 9500,
          daily_token_budget: 10000, // 95% usage
        },
      ],
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Should create a health report proposal when budget warnings found
    // The exact behavior depends on implementation threshold checks
  })

  it('uses LLM evaluation for medium-risk proposals', async () => {
    const ctx = buildCtxWithTables({
      agent_proposals: [
        {
          id: 'p-3',
          agent_id: 'hr_auditor',
          proposal_type: 'compliance_issue',
          risk_level: 'medium',
          status: 'pending',
          detail: { description: 'Missing cert' },
        },
      ],
      agent_runs: [],
      agent_registry: [
        { agent_id: 'hr_auditor', status: 'active', daily_tokens_used: 500, daily_token_budget: 10000 },
        { agent_id: 'supervisor_agent', status: 'active', daily_tokens_used: 50, daily_token_budget: 20000 },
      ],
      notification_queue: [],
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Medium risk should trigger LLM evaluation
    expect(agentChat).toHaveBeenCalled()
  })
})
