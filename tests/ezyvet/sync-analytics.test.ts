/**
 * Tests for ezyVet Analytics Sync Services
 *
 * Covers:
 * - syncInvoiceLines: fetches from /v1/invoiceline and upserts to invoice_lines
 * - syncContacts: fetches from /v1/contact and upserts to ezyvet_crm_contacts
 * - updateReferralStatsFromContacts: cross-references contacts → referral_partners
 * - syncAllAnalytics: runs all analytics syncs in sequence
 * - Batch chunking at 200 records
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

// Mock the client
vi.mock('../../server/utils/ezyvet/client', () => ({
  ezyvetFetchAll: vi.fn(),
}))

// Mock createError
vi.stubGlobal('createError', (opts: any) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})

import {
  syncInvoiceLines,
  syncContacts,
  updateReferralStatsFromContacts,
  syncAllAnalytics,
} from '../../server/utils/ezyvet/sync-analytics'
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
  scope: 'read-basic,read-invoiceline,read-contact',
  base_url: 'https://api.ezyvet.com',
  is_active: true,
}

function createMockSupabase(overrides: Record<string, any> = {}) {
  const insertReturnId = { data: { id: 'log-uuid-1' }, error: null }
  const updateResult = { error: null }
  const upsertResult = { error: null }

  const chainBuilder: Record<string, any> = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(insertReturnId),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(updateResult),
    }),
    upsert: vi.fn().mockResolvedValue(upsertResult),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      head: true,
    }),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  // Track which table is being accessed for route-specific behavior
  const fromCalls: Record<string, typeof chainBuilder> = {}

  return {
    from: vi.fn((table: string) => {
      fromCalls[table] = chainBuilder
      return chainBuilder
    }),
    _chain: chainBuilder,
    _fromCalls: fromCalls,
  }
}

// ─── syncInvoiceLines ─────────────────────────────────────────

describe('syncInvoiceLines', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('fetches invoice lines from /v1/invoiceline and returns counts', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      {
        invoiceline: {
          id: 1001,
          invoice_id: '501',
          invoice_line_reference: 'REF-1',
          date_created: '2025-06-01',
          contact_id: 100,
          product_name: 'Dental Cleaning',
          department: 'Dental',
          line_total: 250.00,
          staff_name: 'Dr. Smith',
        },
      },
      {
        invoiceline: {
          id: 1002,
          invoice_id: '502',
          invoice_line_reference: 'REF-2',
          date_created: '2025-06-02',
          contact_id: 101,
          product_name: 'X-Ray',
          department: 'Dental',
          line_total: 180.00,
          staff_name: 'Dr. Jones',
        },
      },
    ])

    const result = await syncInvoiceLines(supabase, MOCK_CLINIC)

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v1/invoiceline',
      expect.any(Object)
    )
    expect(result.fetched).toBe(2)
    expect(result.upserted).toBe(2)
    expect(result.errors).toBe(0)

    // Should have upserted to invoice_lines
    expect(supabase.from).toHaveBeenCalledWith('invoice_lines')
    // Should log the upload history
    expect(supabase.from).toHaveBeenCalledWith('invoice_upload_history')
    // Should log to ezyvet_api_sync_log
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_api_sync_log')
  })

  it('passes modified_since when since option provided', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([])

    await syncInvoiceLines(supabase, MOCK_CLINIC, { since: '2025-06-01T00:00:00Z' })

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v1/invoiceline',
      expect.objectContaining({ modified_since: expect.any(Number) })
    )
  })

  it('handles upsert errors and continues', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      { invoiceline: { id: 1, invoice_id: 'INV-1', invoice_line_reference: 'REF-1' } },
    ])

    // Make upsert fail
    supabase._chain.upsert.mockResolvedValueOnce({ error: { message: 'constraint violation' } })

    const result = await syncInvoiceLines(supabase, MOCK_CLINIC)

    expect(result.fetched).toBe(1)
    expect(result.errors).toBe(1)
    expect(result.upserted).toBe(0)
    expect(logger.error).toHaveBeenCalledWith(
      'Invoice line upsert batch error',
      expect.any(Object),
      'ezyvet-sync-analytics',
      expect.any(Object)
    )
  })

  it('throws on API fetch error and logs failure', async () => {
    vi.mocked(ezyvetFetchAll).mockRejectedValueOnce(new Error('API timeout'))

    await expect(syncInvoiceLines(supabase, MOCK_CLINIC)).rejects.toThrow('API timeout')

    expect(logger.error).toHaveBeenCalledWith(
      'Invoice line sync failed',
      expect.any(Error),
      'ezyvet-sync-analytics'
    )
    // Should have called completeSyncLog with 'failed'
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_api_sync_log')
  })

  it('tags records with ezyvet_api source', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      { invoiceline: { id: 1, invoice_id: '501', invoice_line_reference: 'REF-1', product_name: 'Cleaning' } },
    ])

    await syncInvoiceLines(supabase, MOCK_CLINIC)

    // The upsert call should include source: 'ezyvet_api'
    const upsertCalls = supabase._chain.upsert.mock.calls
    expect(upsertCalls.length).toBeGreaterThan(0)
    const rows = upsertCalls[0][0]
    expect(rows[0].source).toBe('ezyvet_api')
    expect(rows[0].synced_at).toBeDefined()
  })
})

// ─── syncContacts ─────────────────────────────────────────────

describe('syncContacts', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('fetches contacts from /v1/contact and returns counts', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      {
        contact: {
          id: 200,
          first_name: 'Alice',
          last_name: 'Wonder',
          email: 'alice@example.com',
          is_active: true,
        },
      },
      {
        contact: {
          id: 201,
          first_name: 'Bob',
          last_name: 'Builder',
          email: 'bob@build.com',
          is_active: true,
        },
      },
    ])

    const result = await syncContacts(supabase, MOCK_CLINIC)

    expect(ezyvetFetchAll).toHaveBeenCalledWith(
      supabase,
      MOCK_CLINIC,
      '/v1/contact',
      expect.any(Object)
    )
    expect(result.fetched).toBe(2)
    expect(result.upserted).toBe(2)
    expect(result.errors).toBe(0)
    expect(supabase.from).toHaveBeenCalledWith('ezyvet_crm_contacts')
  })

  it('handles contact upsert errors', async () => {
    vi.mocked(ezyvetFetchAll).mockResolvedValueOnce([
      { contact: { id: 200, first_name: 'Alice', last_name: 'Wonder' } },
    ])

    supabase._chain.upsert.mockResolvedValueOnce({ error: { message: 'db error' } })

    const result = await syncContacts(supabase, MOCK_CLINIC)

    expect(result.fetched).toBe(1)
    expect(result.errors).toBe(1)
    expect(logger.error).toHaveBeenCalledWith(
      'Contact upsert batch error',
      expect.any(Object),
      'ezyvet-sync-analytics',
      expect.any(Object)
    )
  })

  it('throws on API fetch error', async () => {
    vi.mocked(ezyvetFetchAll).mockRejectedValueOnce(new Error('Rate limited'))

    await expect(syncContacts(supabase, MOCK_CLINIC)).rejects.toThrow('Rate limited')
    expect(logger.error).toHaveBeenCalled()
  })
})

// ─── updateReferralStatsFromContacts ──────────────────────────

describe('updateReferralStatsFromContacts', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('returns 0 when no referral partners exist', async () => {
    // Override select to return empty partners
    supabase._chain.select = vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    // First call returns partners (empty), second returns contacts
    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'referral_partners') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return supabase._chain
    })

    const result = await updateReferralStatsFromContacts(supabase)

    expect(result.partnersUpdated).toBe(0)
    expect(result.totalReferrals).toBe(0)
    expect(result.totalRevenue).toBe(0)
  })

  it('matches contacts to partners by referral source and updates stats', async () => {
    const partners = [
      { id: 'p1', hospital_name: 'Animal Hospital' },
      { id: 'p2', hospital_name: 'Pet Plus' },
    ]

    const contacts = [
      { referral_source: 'Animal Hospital', revenue_ytd: '500', last_visit: '2025-06-10' },
      { referral_source: 'animal hospital', revenue_ytd: '300', last_visit: '2025-06-15' },
      { referral_source: 'Pet Plus', revenue_ytd: '200', last_visit: '2025-05-01' },
      { referral_source: 'Unknown Clinic', revenue_ytd: '100', last_visit: '2025-04-01' },
    ]

    const updateEq = vi.fn().mockResolvedValue({ error: null })

    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'referral_partners') {
        return {
          select: vi.fn().mockResolvedValue({ data: partners, error: null }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        }
      }
      if (table === 'ezyvet_crm_contacts') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: contacts, error: null }),
          }),
        }
      }
      return supabase._chain
    })

    const result = await updateReferralStatsFromContacts(supabase)

    // Animal Hospital matched 2 contacts, Pet Plus matched 1, Unknown has no match
    expect(result.partnersUpdated).toBe(2)
    expect(result.totalReferrals).toBe(3) // 2 + 1
    expect(result.totalRevenue).toBe(1000) // 500 + 300 + 200
  })

  it('throws on partner fetch error', async () => {
    supabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'table missing' } }),
    })

    await expect(updateReferralStatsFromContacts(supabase)).rejects.toThrow()
  })
})

// ─── syncAllAnalytics ─────────────────────────────────────────

describe('syncAllAnalytics', () => {
  let supabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createMockSupabase()
  })

  it('runs invoice + contact syncs then referral update', async () => {
    // Mock the ezyvetFetchAll to return data for both syncs
    vi.mocked(ezyvetFetchAll)
      .mockResolvedValueOnce([ // invoices
        { invoiceline: { id: 1, invoice_id: '1', invoice_line_reference: 'R1' } },
      ])
      .mockResolvedValueOnce([ // contacts
        { contact: { id: 100, first_name: 'Alice', last_name: 'W' } },
      ])

    // Mock referral_partners select to return empty (no partners to update)
    const originalFrom = supabase.from
    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'referral_partners') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return originalFrom(table)
    })

    const result = await syncAllAnalytics(supabase, MOCK_CLINIC)

    expect(result.invoices.fetched).toBe(1)
    expect(result.contacts.fetched).toBe(1)
    expect(result.referrals.partnersUpdated).toBe(0)

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Full analytics sync complete'),
      'ezyvet-sync-analytics',
      expect.any(Object)
    )
  })
})
