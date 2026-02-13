/**
 * Tests for Agent B4: Payroll Watchdog
 *
 * Covers:
 * - Returns 0 proposals when no time entries
 * - Returns 0 proposals when no employees
 * - Detects missing clock-out
 * - Detects overtime risk (approaching 40h)
 * - Throws on Supabase error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-789'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('~/utils/vetBenchmarks', () => ({
  STAFFING_BENCHMARKS: {
    californiaOT: { dailyDoubletime: 12, weeklyOT: 40 },
  },
  CALIFORNIA_FACTORS: {},
  FINANCIAL_BENCHMARKS: {},
}))

import { createProposal } from '../../server/utils/agents/proposals'

describe('payroll-watchdog handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/payroll-watchdog')
    handler = mod.default
  })

  it('returns 0 proposals when no time entries', async () => {
    const ctx = createMockContext({ agentId: 'payroll_watchdog' })

    mockTables(ctx.supabase as any, {
      time_entries: { data: [] },
      employees: { data: [{ id: 'emp-1', first_name: 'A', last_name: 'B', employment_status: 'active', employment_type: 'full_time' }] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('returns 0 proposals when no employees', async () => {
    const ctx = createMockContext({ agentId: 'payroll_watchdog' })

    mockTables(ctx.supabase as any, {
      time_entries: { data: [] },
      employees: { data: [] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('detects missing clock-out', async () => {
    const ctx = createMockContext({ agentId: 'payroll_watchdog' })

    const now = new Date()
    const clockIn = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

    mockTables(ctx.supabase as any, {
      time_entries: { data: [
        { id: 'te-1', employee_id: 'emp-1', shift_id: 'sh-1', clock_in_at: clockIn, clock_out_at: null, total_hours: null, is_approved: false },
      ] },
      employees: { data: [
        { id: 'emp-1', first_name: 'Jane', last_name: 'Doe', employment_status: 'active', employment_type: 'full_time' },
      ] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Missing clock-out should be detected
    expect(createProposal).toHaveBeenCalled()
  })

  it('detects overtime risk', async () => {
    const ctx = createMockContext({ agentId: 'payroll_watchdog' })

    // Simulate 38 hours already worked this week
    const entries = []
    const now = new Date()
    for (let i = 0; i < 4; i++) {
      const clockIn = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000)
      const clockOut = new Date(clockIn.getTime() + 9.5 * 60 * 60 * 1000) // 9.5h shifts
      entries.push({
        id: `te-${i}`,
        employee_id: 'emp-1',
        shift_id: `sh-${i}`,
        clock_in_at: clockIn.toISOString(),
        clock_out_at: clockOut.toISOString(),
        total_hours: 9.5,
        is_approved: true,
      })
    }

    mockTables(ctx.supabase as any, {
      time_entries: { data: entries },
      employees: { data: [
        { id: 'emp-1', first_name: 'Jane', last_name: 'Doe', employment_status: 'active', employment_type: 'full_time' },
      ] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // 4 × 9.5h = 38h → overtime warning (>36h threshold)
    expect(createProposal).toHaveBeenCalled()
  })

  it('throws on Supabase time entries fetch error', async () => {
    const ctx = createMockContext({ agentId: 'payroll_watchdog' })

    mockTables(ctx.supabase as any, {
      time_entries: { data: [], error: { message: 'Connection refused' } },
      employees: { data: [] },
      agent_proposals: { data: [] },
    })

    await expect(handler(ctx)).rejects.toThrow('time entries')
  })
})
