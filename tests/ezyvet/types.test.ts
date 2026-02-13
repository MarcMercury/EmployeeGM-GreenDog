/**
 * Tests for ezyVet TypeScript Types
 *
 * Compile-time checks ensuring types match expected shapes.
 * These tests verify the type contracts are correct.
 */

import { describe, it, expect } from 'vitest'
import type {
  EzyVetClinic,
  EzyVetToken,
  EzyVetOAuthResponse,
  EzyVetMeta,
  EzyVetListResponse,
  EzyVetUser,
  EzyVetAppointment,
  EzyVetConsult,
  EzyVetAnimal,
  EzyVetWebhookPayload,
  EzyVetWebhookEvent,
  EzyVetSyncLogEntry,
  EzyVetClientOptions,
  SyncType,
  SyncStatus,
} from '../../server/utils/ezyvet/types'

describe('ezyVet types', () => {
  it('EzyVetClinic has all required fields', () => {
    const clinic: EzyVetClinic = {
      id: 'uuid',
      location_id: null,
      label: 'Venice',
      site_uid: 'site-123',
      partner_id: 'partner-1',
      client_id: 'client-1',
      client_secret: 'secret-1',
      scope: 'read-basic',
      base_url: 'https://api.ezyvet.com',
      is_active: true,
    }
    expect(clinic.label).toBe('Venice')
    expect(clinic.is_active).toBe(true)
  })

  it('EzyVetToken has correct shape', () => {
    const token: EzyVetToken = {
      clinic_id: 'uuid',
      access_token: 'token-abc',
      token_type: 'Bearer',
      expires_at: '2026-02-12T18:00:00Z',
    }
    expect(token.token_type).toBe('Bearer')
  })

  it('EzyVetOAuthResponse matches ezyVet API format', () => {
    const resp: EzyVetOAuthResponse = {
      access_token: 'new-token',
      token_type: 'Bearer',
      expires_in: 43200,
      scope: 'read-basic',
    }
    expect(resp.expires_in).toBe(43200) // 12 hours
  })

  it('EzyVetListResponse wraps items with meta', () => {
    const resp: EzyVetListResponse<{ id: number }> = {
      meta: {
        timestamp: '2026-02-12',
        items_page_total: 10,
        items_page_size: 200,
        items_total: 10,
        page: 1,
        pages_total: 1,
      },
      items: [{ id: 1 }],
    }
    expect(resp.meta.pages_total).toBe(1)
    expect(resp.items).toHaveLength(1)
  })

  it('EzyVetAppointment uses Unix timestamps', () => {
    const appt: EzyVetAppointment = {
      id: 100,
      start_at: 1770800400,
      end_at: 1770804000,
      appointment_type_id: 1,
      status_id: 2,
    }
    expect(appt.start_at).toBeGreaterThan(0)
  })

  it('SyncType enumerates valid types', () => {
    const types: SyncType[] = ['users', 'appointments', 'consults', 'animals', 'invoices', 'contacts', 'full']
    expect(types).toHaveLength(7)
  })

  it('SyncStatus enumerates valid statuses', () => {
    const statuses: SyncStatus[] = ['running', 'completed', 'failed']
    expect(statuses).toHaveLength(3)
  })

  it('EzyVetWebhookPayload matches webhook format', () => {
    const payload: EzyVetWebhookPayload = {
      event: 'appointment.created',
      items: [{ id: 1, type: 'appointment' }],
    }
    expect(payload.event).toContain('appointment')
  })

  it('EzyVetClientOptions has sensible defaults', () => {
    const opts: EzyVetClientOptions = {
      rateLimitPerEndpoint: 60,
      rateLimitGlobal: 180,
      maxPageSize: 200,
      maxRetries: 5,
      useTrial: false,
    }
    expect(opts.rateLimitPerEndpoint).toBe(60)
    expect(opts.maxPageSize).toBeLessThanOrEqual(200)
  })
})
