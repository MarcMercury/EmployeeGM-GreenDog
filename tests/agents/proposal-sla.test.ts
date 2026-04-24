/**
 * Tests for the proposal-sla agent handler.
 *
 * Cover:
 * - No pending proposals → 0 proposals created
 * - Past-expires proposals auto-expired and reported
 * - Stale-pending (no expires_at) reported
 * - auto_expire=false leaves status unchanged but still reports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-sla'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createProposal } from '../../server/utils/agents/proposals'

/**
 * Build a mock supabase whose `from('agent_proposals')` chain returns:
 *  - on the first non-null `.lt('expires_at', ...)` call → expiredRows
 *  - on the `.lt('created_at', ...)` call → staleRows
 *  - on `.update(...).in(...)` → updateError or null
 */
function buildMockSupabase(opts: {
  expiredRows: any[]
  staleRows: any[]
  updateError?: { message: string } | null
}) {
  const updateIn = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const updateMock = vi.fn().mockReturnValue({ in: updateIn })

  const select = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const not = vi.fn().mockReturnThis()
  const lt = vi.fn().mockImplementation(function (this: any, col: string) {
    if (col === 'expires_at') {
      return Promise.resolve({ data: opts.expiredRows, error: null })
    }
    if (col === 'created_at') {
      return Promise.resolve({ data: opts.staleRows, error: null })
    }
    return Promise.resolve({ data: [], error: null })
  })

  const builder = { select, eq, not, lt, update: updateMock }
  const from = vi.fn().mockReturnValue(builder)

  return { from, _updateMock: updateMock, _updateIn: updateIn }
}

describe('proposal-sla handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/proposal-sla')
    handler = mod.default
  })

  it('returns 0 issues when no pending proposals are stale or expired', async () => {
    const ctx = createMockContext({ agentId: 'proposal_sla' })
    ;(ctx as any).supabase = buildMockSupabase({ expiredRows: [], staleRows: [] })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
    expect(result.metadata?.expired_count).toBe(0)
    expect(result.metadata?.stale_pending_count).toBe(0)
  })

  it('auto-expires past-due proposals and creates a health_report', async () => {
    const expired = [
      { id: 'p1', agent_id: 'gap_analyzer', title: 'Stale gap', created_at: '2026-04-01', expires_at: '2026-04-10', risk_level: 'low' },
    ]
    const ctx = createMockContext({ agentId: 'proposal_sla' })
    const mock = buildMockSupabase({ expiredRows: expired, staleRows: [] })
    ;(ctx as any).supabase = mock

    const result = await handler(ctx)

    expect(mock._updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'expired' }),
    )
    expect(mock._updateIn).toHaveBeenCalledWith('id', ['p1'])
    expect(result.metadata?.auto_expired_count).toBe(1)
    expect(result.proposalsCreated).toBe(1)
    expect(createProposal).toHaveBeenCalledWith(
      expect.objectContaining({ proposalType: 'health_report' }),
    )
  })

  it('reports stale pending proposals without auto-expiring them', async () => {
    const stale = [
      { id: 'p2', agent_id: 'skill_scout', title: 'Old pending', created_at: '2026-04-01', expires_at: null, risk_level: 'low' },
    ]
    const ctx = createMockContext({ agentId: 'proposal_sla' })
    const mock = buildMockSupabase({ expiredRows: [], staleRows: stale })
    ;(ctx as any).supabase = mock

    const result = await handler(ctx)

    expect(result.metadata?.stale_pending_count).toBe(1)
    expect(result.metadata?.auto_expired_count).toBe(0)
    expect(result.proposalsCreated).toBe(1)
  })

  it('honors auto_expire=false config', async () => {
    const expired = [
      { id: 'p3', agent_id: 'role_mapper', title: 'x', created_at: '2026-04-01', expires_at: '2026-04-10', risk_level: 'low' },
    ]
    const ctx = createMockContext({
      agentId: 'proposal_sla',
      config: { auto_expire: false },
    })
    const mock = buildMockSupabase({ expiredRows: expired, staleRows: [] })
    ;(ctx as any).supabase = mock

    const result = await handler(ctx)

    expect(mock._updateMock).not.toHaveBeenCalled()
    expect(result.metadata?.auto_expired_count).toBe(0)
    expect(result.metadata?.expired_count).toBe(1)
    expect(result.proposalsCreated).toBe(1)
  })
})
