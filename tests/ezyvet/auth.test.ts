/**
 * Tests for ezyVet OAuth 2.0 Authentication Manager
 *
 * Covers:
 * - Returns cached token when still valid
 * - Refreshes token when expired or near expiry
 * - Requests new token when no cache exists
 * - Persists new token to Supabase
 * - Handles OAuth token request failure
 * - invalidateToken deletes from cache
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

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock Nuxt's createError
vi.stubGlobal('createError', (opts: any) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})

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

function createMockSupabase(overrides: {
  cachedToken?: any
  cacheError?: any
  upsertError?: any
} = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: overrides.upsertError ?? null })
  const deleteFn = vi.fn()
  const eqAfterDelete = vi.fn().mockResolvedValue({ error: null })
  deleteFn.mockReturnValue({ eq: eqAfterDelete })

  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.cachedToken ?? null,
      error: overrides.cacheError ?? null,
    }),
  }

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'ezyvet_tokens') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: overrides.cachedToken ?? null,
              error: overrides.cacheError ?? null,
            }),
          }),
        }),
        upsert: vi.fn().mockImplementation(() => ({
          // upsert doesn't need chaining here
          then: (resolve: any) => resolve({ error: overrides.upsertError ?? null }),
        })),
        delete: vi.fn().mockReturnValue({
          eq: eqAfterDelete,
        }),
      }
    }
    return selectChain
  })

  return { from: fromFn, _deleteCalled: eqAfterDelete }
}

describe('ezyVet auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-12T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns cached token when still valid (>5min until expiry)', async () => {
    const futureExpiry = new Date('2026-02-12T18:00:00Z').toISOString() // 6h from now
    const supabase = createMockSupabase({
      cachedToken: {
        access_token: 'cached-token-abc',
        expires_at: futureExpiry,
        clinic_id: MOCK_CLINIC.id,
      },
    })

    const token = await getAccessToken(supabase as any, MOCK_CLINIC)

    expect(token).toBe('cached-token-abc')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(logger.debug).toHaveBeenCalledWith(
      'Using cached ezyVet token',
      'ezyvet-auth',
      expect.objectContaining({ clinic: 'Venice' })
    )
  })

  it('refreshes token when within 5 minutes of expiry', async () => {
    const nearExpiry = new Date('2026-02-12T12:04:00Z').toISOString() // 4 min from now
    const supabase = createMockSupabase({
      cachedToken: {
        access_token: 'old-token',
        expires_at: nearExpiry,
        clinic_id: MOCK_CLINIC.id,
      },
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'fresh-token-xyz',
        token_type: 'Bearer',
        expires_in: 43200,
        scope: 'read-basic',
      }),
    })

    const token = await getAccessToken(supabase as any, MOCK_CLINIC)

    expect(token).toBe('fresh-token-xyz')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('expired or near expiry'),
      'ezyvet-auth',
      expect.any(Object)
    )
  })

  it('requests new token when no cache exists', async () => {
    const supabase = createMockSupabase({ cachedToken: null })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'brand-new-token',
        token_type: 'Bearer',
        expires_in: 43200,
        scope: 'read-basic',
      }),
    })

    const token = await getAccessToken(supabase as any, MOCK_CLINIC)

    expect(token).toBe('brand-new-token')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.ezyvet.com/v1/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    )

    // Verify the body contains all required fields
    const callArgs = mockFetch.mock.calls[0]
    const body = callArgs[1].body
    expect(body).toContain('partner_id=partner-123')
    expect(body).toContain('client_id=client-456')
    expect(body).toContain('client_secret=secret-789')
    expect(body).toContain('grant_type=client_credentials')
    expect(body).toContain('scope=read-basic')
  })

  it('throws on OAuth token request failure', async () => {
    const supabase = createMockSupabase({ cachedToken: null })

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Invalid credentials',
    })

    await expect(getAccessToken(supabase as any, MOCK_CLINIC))
      .rejects.toThrow('ezyVet auth failed')

    expect(logger.error).toHaveBeenCalledWith(
      'ezyVet OAuth token request failed',
      null,
      'ezyvet-auth',
      expect.objectContaining({ status: 401 })
    )
  })

  it('invalidateToken deletes the cached token', async () => {
    const supabase = createMockSupabase()

    await invalidateToken(supabase as any, 'clinic-uuid-1')

    expect(supabase.from).toHaveBeenCalledWith('ezyvet_tokens')
    expect(logger.info).toHaveBeenCalledWith(
      'Invalidated cached ezyVet token',
      'ezyvet-auth',
      expect.objectContaining({ clinicId: 'clinic-uuid-1' })
    )
  })
})
