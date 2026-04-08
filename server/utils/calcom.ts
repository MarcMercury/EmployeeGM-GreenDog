/**
 * Cal.com API - Server Utility
 * ==============================
 * Self-hosted or cloud scheduling for interviews, CE events, shadow visits.
 *
 * Setup: https://cal.com/docs/enterprise-features/api
 */
import type { CalComBooking, CalComEventType } from '~/types/external-apis.types'

const DEFAULT_BASE = 'https://api.cal.com/v1'

function getBaseUrl(): string {
  const config = useRuntimeConfig()
  return config.calcomBaseUrl || DEFAULT_BASE
}

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.calcomApiKey) throw new Error('Cal.com API key not configured')
  return config.calcomApiKey
}

async function calcomFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey()
  const separator = path.includes('?') ? '&' : '?'
  return $fetch<T>(`${getBaseUrl()}${path}${separator}apiKey=${apiKey}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

export async function listCalcomEventTypes(): Promise<CalComEventType[]> {
  const result = await calcomFetch<{ event_types: CalComEventType[] }>('/event-types')
  return result.event_types || []
}

export async function listCalcomBookings(status?: string): Promise<CalComBooking[]> {
  const params = status ? `?status=${status}` : ''
  const result = await calcomFetch<{ bookings: CalComBooking[] }>(`/bookings${params}`)
  return result.bookings || []
}

export async function createCalcomBooking(data: {
  eventTypeId: number
  start: string
  end: string
  name: string
  email: string
  timeZone: string
  notes?: string
}): Promise<CalComBooking> {
  return calcomFetch<CalComBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      eventTypeId: data.eventTypeId,
      start: data.start,
      end: data.end,
      responses: {
        name: data.name,
        email: data.email,
        notes: data.notes || '',
      },
      timeZone: data.timeZone,
    }),
  })
}

export async function cancelCalcomBooking(bookingId: number, reason?: string): Promise<void> {
  await calcomFetch(`/bookings/${bookingId}/cancel`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  })
}
