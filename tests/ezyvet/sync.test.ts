/**
 * Tests for ezyVet Sync Services
 *
 * Covers:
 * - syncUsers: fetches from /v4/user and upserts to ezyvet_users
 * - syncAppointments: fetches from /v2/appointment with date filtering
 * - syncConsults: fetches from /v1/consult with date filtering
 * - syncAll: runs all syncs in parallel
 * - Sync log creation and completion
 * - Error handling during sync
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('../../server/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the client's ezyvetFetchAll
vi.mock('../../server/utils/ezyvet/client', () => ({
  ezyvetFetchAll: vi.fn(),
}))

// Mock createError
vi.stubGlobal('createError', (opts: any) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})

import { syncUsers, syncAppointments, syncConsults, syncAll } from '../../server/utils/ezyvet/sync'
import { ezyvetFetchAll } from '../../server/utils/ezyvet/client'
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
  const insertReturnId = { data: { id: 'log-uuid-1' }, error: null }
  const updateResult = { error: null }
  const upsertResult = { error: null }

  const chainBuilder = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(insertReturnId),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(updateResult),
    }),
    upsert: vi.fn().mockResolvedValue(upsertResult),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    from: vi.fn().mockReturnValue(chainBuilder),
    _chain: chainBuilder,
  }
}

describe('syncUsers', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('fetches users from /v4/user and returns counts', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      { user: { id: 1, first_name: 'Jane', last_name: 'Doe', email: 'jane@gdd.com', active: true, role: 'DVM' } },
      { user: { id: 2, first_name: 'John', last_name: 'Smith', email: 'john@gdd.com', active: false, role: 'Tech' } },
    ])

    const result = await syncUsers(supabase, MOCK_CLINIC, 'manual')

    expect(ezyvetFetchAll).toHaveBeenCalledWith(supabase, MOCK_CLINIC, '/v4/user')
    expect(result.fetched).toBe(2)
    expect(result.upserted).toBe(2)
    expect(result.errors).toBe(0)

    // Verify sync log was created
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_api_sync_log')
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_users')
  })

  it('handles upsert errors gracefully', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      { user: { id: 1, first_name: 'Jane', last_name: 'Doe', email: 'jane@gdd.com', active: true } },
    ])

    // Make upsert fail
    supabase._chain.upsert.mockResolvedValueOnce({ error: { message: 'constraint violation' } })

    const result = await syncUsers(supabase, MOCK_CLINIC, 'manual')

    expect(result.fetched).toBe(1)
    expect(result.errors).toBe(1)
    expect(logger.error).toHaveBeenCalledWith(
      'User upsert batch error',
      expect.any(Object),
      'ezyvet-sync',
      expect.any(Object)
    )
  })

  it('handles API fetch errors and logs to sync log', async () => {
    vi.mocked(ezyvetFetchAll).mockRejectedValueOnce(new Error('API timeout'))

    await expect(syncUsers(supabase, MOCK_CLINIC, 'manual'))
      .rejects.toThrow('API timeout')

    // Sync log should be updated with 'failed' status
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_api_sync_log')
  })
})

describe('syncAppointments', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('fetches appointments from /v2/appointment', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      {
        appointment: {
          id: 100,
          start_at: 1770800400, // Unix timestamp
          end_at: 1770804000,
          appointment_type_id: 1,
          status_id: 2,
          status_name: 'Confirmed',
          animal_id: 500,
          animal_name: 'Buddy',
          contact_id: 300,
        },
      },
    ])

    const result = await syncAppointments(supabase, MOCK_CLINIC)

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v2/appointment',
      expect.any(Object)
    )
    expect(result.fetched).toBe(1)
    expect(result.upserted).toBe(1)
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_appointments')
  })

  it('passes modified_since param when since option provided', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([])

    await syncAppointments(supabase, MOCK_CLINIC, {
      since: '2026-02-12T00:00:00Z',
    })

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v2/appointment',
      expect.objectContaining({
        modified_since: expect.any(Number),
      })
    )
  })
})

describe('syncConsults', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('fetches consults from /v1/consult', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      {
        consult: {
          id: 200,
          consult_type_id: 1,
          status: 'completed',
          animal_id: 500,
          vet_user_id: 10,
          vet_name: 'Dr. Smith',
          date_created: '2026-02-10',
        },
      },
    ])

    const result = await syncConsults(supabase, MOCK_CLINIC)

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v1/consult',
      expect.any(Object)
    )
    expect(result.fetched).toBe(1)
    expect(result.upserted).toBe(1)
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_consults')
  })
})

describe('syncAll', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('runs all syncs and returns combined results', async () => {
    // Each sync type will be called
    vi.mocked(ezyvetFetchAll)
      .mockResolvedValueOnce([{ user: { id: 1, first_name: 'A', last_name: 'B', email: 'a@b.com', active: true } }]) // users
      .mockResolvedValueOnce([{ appointment: { id: 100, start_at: 1770800400, end_at: 1770804000 } }]) // appointments
      .mockResolvedValueOnce([{ consult: { id: 200, status: 'done' } }]) // consults

    const result = await syncAll(supabase, MOCK_CLINIC, { triggeredBy: 'cron' })

    expect(result.users.fetched).toBe(1)
    expect(result.appointments.fetched).toBe(1)
    expect(result.consults.fetched).toBe(1)

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('full ezyVet sync'),
      'ezyvet-sync'
    )
  })
})
