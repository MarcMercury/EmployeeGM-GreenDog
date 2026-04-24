/**
 * Tests for the data-freshness agent handler.
 *
 * Cover:
 * - All sources fresh → 0 proposals
 * - Stale source (age > max_age_hours) → proposal created with metadata
 * - Empty source → counted as problem
 * - Supabase error on a source → counted as error, does not throw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-df'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createProposal } from '../../server/utils/agents/proposals'

describe('data-freshness handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/data-freshness')
    handler = mod.default
  })

  it('returns 0 proposals when all configured sources are fresh', async () => {
    const nowIso = new Date().toISOString()
    const ctx = createMockContext({
      agentId: 'data_freshness',
      config: {
        sources: [
          { key: 'src_a', table: 'table_a', timestamp_column: 'created_at', max_age_hours: 24 },
        ],
      },
    })
    mockTables(ctx.supabase as any, {
      table_a: { data: [{ created_at: nowIso }] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
    expect(result.metadata?.sources_ok).toBe(1)
    expect(result.metadata?.sources_stale).toBe(0)
  })

  it('creates a proposal when a source is stale', async () => {
    const staleIso = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() // 72h ago
    const ctx = createMockContext({
      agentId: 'data_freshness',
      config: {
        sources: [
          { key: 'src_a', table: 'table_a', timestamp_column: 'created_at', max_age_hours: 24 },
        ],
      },
    })
    mockTables(ctx.supabase as any, {
      table_a: { data: [{ created_at: staleIso }] },
    })

    const result = await handler(ctx)

    expect(result.proposalsCreated).toBe(1)
    expect(result.metadata?.sources_stale).toBe(1)
    expect(createProposal).toHaveBeenCalledWith(
      expect.objectContaining({ proposalType: 'health_report' }),
    )
  })

  it('flags an empty source as a problem', async () => {
    const ctx = createMockContext({
      agentId: 'data_freshness',
      config: {
        sources: [
          { key: 'src_a', table: 'table_a', timestamp_column: 'created_at', max_age_hours: 24 },
        ],
      },
    })
    mockTables(ctx.supabase as any, {
      table_a: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.metadata?.sources_empty).toBe(1)
    expect(result.proposalsCreated).toBe(1)
  })

  it('counts Supabase errors without throwing', async () => {
    const ctx = createMockContext({
      agentId: 'data_freshness',
      config: {
        sources: [
          { key: 'src_a', table: 'table_a', timestamp_column: 'created_at', max_age_hours: 24 },
        ],
      },
    })
    mockTables(ctx.supabase as any, {
      table_a: { data: [], error: { message: 'permission denied' } },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.metadata?.sources_error).toBe(1)
  })
})
