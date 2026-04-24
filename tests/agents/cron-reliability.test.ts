/**
 * Tests for the cron-reliability agent handler.
 *
 * Cover:
 * - No active scheduled agents → returns success with 0 proposals
 * - Stale agent (no last_run_at older than threshold) → creates proposal
 * - Noisy agent (>= threshold errors) → creates proposal
 * - Custom thresholds from ctx.config override defaults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-abc'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createProposal } from '../../server/utils/agents/proposals'

describe('cron-reliability handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/cron-reliability')
    handler = mod.default
  })

  it('returns success with 0 proposals when no scheduled agents exist', async () => {
    const ctx = createMockContext({ agentId: 'cron_reliability' })
    mockTables(ctx.supabase as any, {
      agent_registry: { data: [{ agent_id: 'manual_only', status: 'active', schedule_cron: null }] },
      agent_runs: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
    expect(result.metadata?.scheduled_agents).toBe(0)
  })

  it('creates a proposal when a scheduled agent is stale', async () => {
    const ctx = createMockContext({ agentId: 'cron_reliability' })
    const oldIso = new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString() // 100h ago
    mockTables(ctx.supabase as any, {
      agent_registry: {
        data: [
          {
            agent_id: 'scheduled_a',
            display_name: 'Scheduled A',
            schedule_cron: '0 * * * *',
            last_run_at: oldIso,
            last_run_status: 'success',
          },
        ],
      },
      agent_runs: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(1)
    expect(createProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalType: 'health_report',
        riskLevel: 'low',
      }),
    )
    expect(result.metadata?.stale_agents).toBe(1)
  })

  it('creates a proposal when an agent exceeds error threshold', async () => {
    const ctx = createMockContext({
      agentId: 'cron_reliability',
      config: { error_warn_threshold: 2 },
    })
    const nowIso = new Date().toISOString()
    mockTables(ctx.supabase as any, {
      agent_registry: {
        data: [
          {
            agent_id: 'noisy',
            display_name: 'Noisy',
            schedule_cron: '*/5 * * * *',
            last_run_at: nowIso,
            last_run_status: 'error',
          },
        ],
      },
      agent_runs: {
        data: [
          { agent_id: 'noisy', started_at: nowIso, status: 'error' },
          { agent_id: 'noisy', started_at: nowIso, status: 'error' },
        ],
      },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(1)
    expect(result.metadata?.noisy_agents).toBe(1)
  })

  it('honors a custom stale_hours config override', async () => {
    const ctx = createMockContext({
      agentId: 'cron_reliability',
      config: { stale_hours: 1 },
    })
    const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    mockTables(ctx.supabase as any, {
      agent_registry: {
        data: [
          {
            agent_id: 'scheduled_b',
            display_name: 'Scheduled B',
            schedule_cron: '*/30 * * * *',
            last_run_at: twoHoursAgo,
            last_run_status: 'success',
          },
        ],
      },
      agent_runs: { data: [] },
    })

    const result = await handler(ctx)

    // With default 48h threshold this would be ok; with 1h it's stale.
    expect(result.metadata?.stale_agents).toBe(1)
    expect(result.proposalsCreated).toBe(1)
  })
})
