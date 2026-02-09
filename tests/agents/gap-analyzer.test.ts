/**
 * Tests for the gap-analyzer agent handler.
 *
 * Tests cover:
 * - Empty employee data → graceful early return
 * - No role expectations → early return with 0 proposals
 * - Normal gap analysis flow → creates proposal
 * - Handles Supabase errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, mockTables } from '../helpers/mock-supabase'

// Mock the external dependencies that handlers import
vi.mock('../../server/utils/agents/proposals', () => ({
  createProposal: vi.fn().mockResolvedValue('proposal-123'),
  autoApproveProposal: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocks
import { createProposal, autoApproveProposal } from '../../server/utils/agents/proposals'

describe('gap-analyzer handler', () => {
  let handler: (ctx: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import to get fresh module each time
    const mod = await import('../../server/agents/handlers/gap-analyzer')
    handler = mod.default
  })

  it('returns early with 0 proposals when no employees found', async () => {
    const ctx = createMockContext({ agentId: 'gap_analyzer' })

    mockTables(ctx.supabase as any, {
      employees: { data: [] },
      role_skill_expectations: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('returns early when no role expectations exist', async () => {
    const ctx = createMockContext({ agentId: 'gap_analyzer' })

    mockTables(ctx.supabase as any, {
      employees: {
        data: [
          { id: 'emp-1', first_name: 'Jane', last_name: 'Doe', status: 'active', position_title: 'Vet Tech' },
        ],
      },
      role_skill_expectations: { data: [] },
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(result.proposalsCreated).toBe(0)
  })

  it('creates a skill gap proposal when gaps are found', async () => {
    const ctx = createMockContext({ agentId: 'gap_analyzer' })

    const employees = [
      { id: 'emp-1', first_name: 'Jane', last_name: 'Doe', status: 'active', job_position_id: 'pos-1', department_id: 'dep-1' },
    ]
    const expectations = [
      { job_position_id: 'pos-1', skill_id: 'skill-1', expected_level: 4, importance: 'required' },
    ]
    const skills = [
      { id: 'skill-1', name: 'Surgery Assist', category: 'clinical' },
    ]
    const empSkills = [
      { employee_id: 'emp-1', skill_id: 'skill-1', current_level: 2 },
    ]
    const courses: any[] = []

    const tableData: Record<string, any[]> = {
      employees,
      role_skill_expectations: expectations,
      skill_library: skills,
      employee_skills: empSkills,
      training_courses: courses,
      employee_skill_gaps: [],
    }

    // Track insert calls
    const insertCalls: any[] = []

    ;(ctx.supabase as any).from.mockImplementation((table: string) => {
      const data = tableData[table] ?? []
      const builder: any = {}
      const methods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'order', 'limit', 'delete', 'update']
      for (const m of methods) {
        builder[m] = vi.fn().mockReturnValue(builder)
      }
      builder.insert = vi.fn().mockImplementation((rows: any) => {
        insertCalls.push({ table, rows })
        return builder
      })
      builder.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null })
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null })
      Object.defineProperty(builder, 'then', {
        value: (resolve: any) => resolve({ data, error: null }),
        writable: true,
        configurable: true,
      })
      return builder
    })

    const result = await handler(ctx)

    expect(result.status).toBe('success')
    expect(createProposal).toHaveBeenCalled()
    expect(autoApproveProposal).toHaveBeenCalled()
    expect(result.proposalsCreated).toBeGreaterThanOrEqual(1)
  })

  it('throws on Supabase error (lets executeAgentRun handle failure)', async () => {
    const ctx = createMockContext({ agentId: 'gap_analyzer' })

    // Make employees query return an error
    const errorBuilder: any = {}
    const methods = ['select', 'eq', 'neq', 'order', 'limit', 'delete', 'insert', 'update']
    for (const m of methods) {
      errorBuilder[m] = vi.fn().mockReturnValue(errorBuilder)
    }
    Object.defineProperty(errorBuilder, 'then', {
      value: (resolve: any) => resolve({ data: null, error: { message: 'DB Error' } }),
      writable: true,
      configurable: true,
    })

    ;(ctx.supabase as any).from.mockReturnValue(errorBuilder)

    // Handler throws on DB errors — executeAgentRun catches and marks as failed
    await expect(handler(ctx)).rejects.toThrow('Failed to fetch employees')
  })
})
