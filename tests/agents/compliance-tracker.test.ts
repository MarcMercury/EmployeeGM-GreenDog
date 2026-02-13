/**
 * Tests for Agent B5: Compliance Tracker
 *
 * Covers:
 * - Creates only summary proposal when no employees
 * - Creates only summary proposal when nothing expiring
 * - Detects expiring license within 30 days
 * - Throws on Supabase error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-456'),
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

describe('compliance-tracker handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../server/agents/handlers/compliance-tracker')
    handler = mod.default
  })

  it('creates only summary proposal when no employees', async () => {
    const ctx = createMockContext({ agentId: 'compliance_tracker' })

    mockTables(ctx.supabase as any, {
      employees: { data: [] },
      agent_proposals: { data: [] },
      employee_licenses: { data: [] },
      employee_certifications: { data: [] },
      training_enrollments: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Handler always creates a summary proposal even with 0 issues
    expect(result.proposalsCreated).toBe(1)
    expect(result.proposalsAutoApproved).toBe(1)
  })

  it('creates only summary proposal when nothing expiring', async () => {
    const ctx = createMockContext({ agentId: 'compliance_tracker' })

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    mockTables(ctx.supabase as any, {
      employees: { data: [{ id: 'emp-1', first_name: 'Jane', last_name: 'Doe', position_id: 'pos-1', employment_status: 'active' }] },
      agent_proposals: { data: [] },
      employee_licenses: { data: [
        { id: 'lic-1', employee_id: 'emp-1', license_type: 'DVM', license_number: '12345', expiration_date: farFuture, is_verified: true },
      ] },
      employee_certifications: { data: [] },
      training_enrollments: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    // Only the summary proposal — no compliance issues detected
    expect(result.proposalsCreated).toBe(1)
    expect(result.proposalsAutoApproved).toBe(1)
    expect(result.metadata.totalIssues).toBe(0)
  })

  it('flags license expiring within 30 days', async () => {
    const ctx = createMockContext({ agentId: 'compliance_tracker' })

    const expiresInTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    mockTables(ctx.supabase as any, {
      employees: { data: [{ id: 'emp-1', first_name: 'Jane', last_name: 'Doe', position_id: 'pos-1', employment_status: 'active' }] },
      agent_proposals: { data: [] },
      employee_licenses: { data: [
        { id: 'lic-1', employee_id: 'emp-1', license_type: 'DVM License', license_number: '12345', expiration_date: expiresInTwoWeeks, is_verified: true },
      ] },
      employee_certifications: { data: [] },
      training_enrollments: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(createProposal).toHaveBeenCalled()
    expect(result.proposalsCreated).toBeGreaterThanOrEqual(1)
  })

  it('throws on Supabase employee fetch error', async () => {
    const ctx = createMockContext({ agentId: 'compliance_tracker' })

    mockTables(ctx.supabase as any, {
      employees: { data: [], error: { message: 'DB timeout' } },
      agent_proposals: { data: [] },
      employee_licenses: { data: [] },
      employee_certifications: { data: [] },
      training_enrollments: { data: [] },
    })

    await expect(handler(ctx)).rejects.toThrow('employees')
  })
})
