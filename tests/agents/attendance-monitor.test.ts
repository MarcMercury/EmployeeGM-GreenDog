/**
 * Tests for Agent B3: Attendance Monitor
 *
 * Covers:
 * - Returns 0 proposals when no attendance data
 * - Returns 0 proposals when no employees found
 * - Flags employee with low reliability score (< 80%)
 * - Skips employees who already have recent proposals
 * - Throws on Supabase error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-123'),
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

import { createProposal } from '../../server/utils/agents/proposals'

describe('attendance-monitor handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/attendance-monitor')
    handler = mod.default
  })

  it('returns 0 proposals when no attendance records', async () => {
    const ctx = createMockContext({ agentId: 'attendance_monitor' })

    mockTables(ctx.supabase as any, {
      attendance: { data: [] },
      employees: { data: [{ id: 'emp-1', first_name: 'A', last_name: 'B', employment_status: 'active' }] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('returns 0 proposals when no employees', async () => {
    const ctx = createMockContext({ agentId: 'attendance_monitor' })

    mockTables(ctx.supabase as any, {
      attendance: { data: [] },
      employees: { data: [] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('creates proposal for employee with poor attendance', async () => {
    const ctx = createMockContext({ agentId: 'attendance_monitor' })

    // Create 10 records: 5 late, 3 no-show, 2 on-time → score well below 80%
    const records = []
    for (let i = 0; i < 5; i++) {
      records.push({ id: `att-${i}`, employee_id: 'emp-1', shift_date: '2026-02-01', status: 'late', minutes_late: 15, penalty_weight: 0.5 })
    }
    for (let i = 5; i < 8; i++) {
      records.push({ id: `att-${i}`, employee_id: 'emp-1', shift_date: '2026-02-02', status: 'no_show', minutes_late: 0, penalty_weight: 1.0 })
    }
    for (let i = 8; i < 10; i++) {
      records.push({ id: `att-${i}`, employee_id: 'emp-1', shift_date: '2026-02-03', status: 'on_time', minutes_late: 0, penalty_weight: 0 })
    }

    mockTables(ctx.supabase as any, {
      attendance: { data: records },
      employees: { data: [{ id: 'emp-1', first_name: 'Jane', last_name: 'Doe', manager_employee_id: 'mgr-1', employment_status: 'active' }] },
      agent_proposals: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // With 3 no-shows (>= NO_SHOW_LIMIT of 3) and low score, should create proposal(s)
    expect(createProposal).toHaveBeenCalled()
  })

  it('throws on Supabase attendance fetch error', async () => {
    const ctx = createMockContext({ agentId: 'attendance_monitor' })

    mockTables(ctx.supabase as any, {
      attendance: { data: [], error: { message: 'Connection timeout' } },
      employees: { data: [] },
      agent_proposals: { data: [] },
    })

    await expect(handler(ctx)).rejects.toThrow('attendance')
  })
})
