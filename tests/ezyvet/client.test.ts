/**
 * Tests for ezyVet Rate-Limited HTTP Client
 *
 * Covers:
 * - Successful GET request with auth header
 * - 401 → token invalidation + retry
 * - 403 → scope error thrown
 * - 422 → validation error logged + thrown
 * - 429 → exponential backoff retry
 * - Paginated fetch collects all items
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('../../server/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth module
vi.mock('../../server/utils/ezyvet/auth', () => ({
  getAccessToken: vi.fn().mockResolvedValue('test-bearer-token'),
  invalidateToken: vi.fn().mockResolvedValue(undefined),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock Nuxt's createError
vi.stubGlobal('createError', (opts: any) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  err.data = opts.data
  return err
})

import { ezyvetFetch, ezyvetFetchAll } from '../../server/utils/ezyvet/client'
import { getAccessToken, invalidateToken } from '../../server/utils/ezyvet/auth'
import { logger } from '../../server/utils/logger'

const MOCK_CLINIC = {
  id: 'clinic-uuid-1',
  location_id: null,
  label: 'Venice',
  site_uid: 'venice-site-uid',
  partner_id: 'partner-123',
  client_id: 'client-456',
  client_secret: 'secret-789',
  scope: 'read-basic,read-appointment',
  base_url: 'https://api.ezyvet.com',
  is_active: true,
}

function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }
}

describe('ezyVet client', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
    // Reset the auth mock for each test
    vi.mocked(getAccessToken).mockResolvedValue('test-bearer-token')
  })

  it('makes authenticated GET request with Bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: 1 }], meta: { items_total: 1 } }),
    })

    const result = await ezyvetFetch(supabase, MOCK_CLINIC, '/v2/appointment')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ezyvet.com/v2/appointment',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(result).toEqual({ items: [{ id: 1 }], meta: { items_total: 1 } })
  })

  it('invalidates token and retries on 401', async () => {
    // First call: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'Unauthorized',
    })

    // Second call after token refresh: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'success' }),
    })

    vi.mocked(getAccessToken)
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token')

    const result = await ezyvetFetch(supabase, MOCK_CLINIC, '/v4/user')

    expect(invalidateToken).toHaveBeenCalledWith(supabase, 'clinic-uuid-1')
    expect(result).toEqual({ data: 'success' })
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('401'),
      'ezyvet-client',
      expect.any(Object)
    )
  })

  it('throws scope error on 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden: insufficient scope',
    })

    await expect(ezyvetFetch(supabase, MOCK_CLINIC, '/v1/consult'))
      .rejects.toThrow('scope error')

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('403'),
      null,
      'ezyvet-client',
      expect.objectContaining({ currentScope: 'read-basic,read-appointment' })
    )
  })

  it('logs validation error to Supabase on 422', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ messages: ['Invalid date format'] }),
    })

    await expect(ezyvetFetch(supabase, MOCK_CLINIC, '/v2/appointment'))
      .rejects.toThrow('validation error')

    expect(supabase.from).toHaveBeenCalledWith('ezyvet_api_sync_log')
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('422'),
      null,
      'ezyvet-client',
      expect.objectContaining({ messages: ['Invalid date format'] })
    )
  })

  it('retries with backoff on 429', async () => {
    // First call: 429
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([['Retry-After', '0']]),
    })

    // Second call: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })

    // Mock headers.get
    const mockHeaders = { get: vi.fn().mockReturnValue(null) }
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: mockHeaders,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ retried: true }),
    })

    const result = await ezyvetFetch(supabase, MOCK_CLINIC, '/v4/user')

    expect(result).toEqual({ retried: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('429'),
      'ezyvet-client',
      expect.any(Object)
    )
  })

  it('throws after max retries on persistent 429', async () => {
    const mockHeaders = { get: vi.fn().mockReturnValue('1') }

    // Return 429 for every attempt
    for (let i = 0; i < 4; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: mockHeaders,
      })
    }

    await expect(
      ezyvetFetch(supabase, MOCK_CLINIC, '/v2/appointment', {}, { maxRetries: 1 })
    ).rejects.toThrow('max retries')
  }, 15000)

  it('throws on non-retryable errors (e.g. 500)', async () => {
    // Reset fetch completely for this test
    mockFetch.mockReset()
    vi.mocked(getAccessToken).mockResolvedValue('test-bearer-token')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })

    await expect(ezyvetFetch(supabase, MOCK_CLINIC, '/v4/user'))
      .rejects.toThrow('500')
  }, 10000)
})

describe('ezyvetFetchAll (pagination)', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    supabase = createMockSupabase()
    vi.mocked(getAccessToken).mockResolvedValue('test-bearer-token')
  })

  it('collects items across multiple pages', async () => {
    // Page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        meta: { items_total: 5, items_page_total: 3, pages_total: 2, page: 1, items_page_size: 3 },
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      }),
    })

    // Page 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        meta: { items_total: 5, items_page_total: 2, pages_total: 2, page: 2, items_page_size: 3 },
        items: [{ id: 4 }, { id: 5 }],
      }),
    })

    const items = await ezyvetFetchAll(supabase, MOCK_CLINIC, '/v4/user', {}, { maxPageSize: 3 })

    expect(items).toHaveLength(5)
    expect(items.map((i: any) => i.id)).toEqual([1, 2, 3, 4, 5])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('handles single page response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        meta: { items_total: 2, pages_total: 1, page: 1, items_page_size: 200, items_page_total: 2 },
        items: [{ id: 1 }, { id: 2 }],
      }),
    })

    const items = await ezyvetFetchAll(supabase, MOCK_CLINIC, '/v4/user')

    expect(items).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
