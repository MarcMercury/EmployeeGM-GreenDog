/**
 * Shared test utilities and mock factories for agent handler tests.
 */

import { vi } from 'vitest'
import type { AgentRunContext } from '~/types/agent.types'

/**
 * Create a mock Supabase client with chainable query builder.
 */
export function createMockSupabase() {
  const queryBuilder: Record<string, any> = {}

  const chainMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'is',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
    'or',
    'not',
  ]

  for (const method of chainMethods) {
    queryBuilder[method] = vi.fn().mockReturnValue(queryBuilder)
  }

  // Default return value for terminal calls
  queryBuilder.select.mockReturnValue(queryBuilder)
  queryBuilder.single.mockResolvedValue({ data: null, error: null })
  queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null })

  // Make the base queryBuilder resolve to { data: [], error: null } by default
  Object.defineProperty(queryBuilder, 'then', {
    value: (resolve: any) => resolve({ data: [], error: null }),
    writable: true,
    configurable: true,
  })

  const from = vi.fn().mockReturnValue(queryBuilder)
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    from,
    rpc,
    _queryBuilder: queryBuilder,
  }
}

/**
 * Create a mock AgentRunContext with sensible defaults.
 */
export function createMockContext(
  overrides: Partial<AgentRunContext> = {},
): AgentRunContext {
  const supabase = createMockSupabase()

  return {
    agentId: overrides.agentId ?? 'test_agent',
    runId: overrides.runId ?? 'test-run-123',
    supabase: supabase as any,
    config: overrides.config ?? {},
    triggerType: overrides.triggerType ?? 'manual',
    triggerSource: overrides.triggerSource ?? undefined,
    ...overrides,
  }
}

/**
 * Configure a mock Supabase `from()` call to return specific data.
 * Usage:
 *   mockTable(supabase, 'employees', [{ id: '1', name: 'Test' }])
 */
export function mockTable(
  supabase: ReturnType<typeof createMockSupabase>,
  tableName: string,
  data: any[],
  error: any = null,
) {
  const qb = createChainableBuilder(data, error)
  supabase.from.mockImplementation((table: string) => {
    if (table === tableName) return qb
    // Return default builder for other tables
    return supabase._queryBuilder
  })
  return qb
}

/**
 * Configure multiple tables at once.
 */
export function mockTables(
  supabase: ReturnType<typeof createMockSupabase>,
  tableMap: Record<string, { data: any[]; error?: any }>,
) {
  const builders: Record<string, any> = {}

  for (const [table, config] of Object.entries(tableMap)) {
    builders[table] = createChainableBuilder(config.data, config.error ?? null)
  }

  supabase.from.mockImplementation((table: string) => {
    return builders[table] ?? supabase._queryBuilder
  })

  return builders
}

function createChainableBuilder(data: any[], error: any = null) {
  const builder: Record<string, any> = {}

  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'is',
    'order',
    'limit',
    'range',
    'or',
    'not',
  ]

  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }

  builder.single = vi.fn().mockResolvedValue({
    data: data.length > 0 ? data[0] : null,
    error,
  })

  builder.maybeSingle = vi.fn().mockResolvedValue({
    data: data.length > 0 ? data[0] : null,
    error,
  })

  // Make the builder itself resolve as a thenable
  Object.defineProperty(builder, 'then', {
    value: (resolve: any) => resolve({ data, error }),
    writable: true,
    configurable: true,
  })

  return builder
}
