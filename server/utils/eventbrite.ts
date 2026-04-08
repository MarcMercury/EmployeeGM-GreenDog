/**
 * Eventbrite API - Server Utility
 * ==================================
 * Event registration and ticketing for CE events, marketing events.
 *
 * Setup: https://www.eventbrite.com/platform/api
 */
import type { EventbriteEvent, EventbriteAttendee } from '~/types/external-apis.types'

const BASE_URL = 'https://www.eventbriteapi.com/v3'

function getConfig(): { token: string; organizationId: string } {
  const config = useRuntimeConfig()
  if (!config.eventbriteToken) throw new Error('Eventbrite token not configured')
  return {
    token: config.eventbriteToken,
    organizationId: config.eventbriteOrganizationId || '',
  }
}

async function eventbriteFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = getConfig()
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ── Events ──

/** List organization's events */
export async function listEventbriteEvents(
  options?: { status?: string; page?: number }
): Promise<{ events: EventbriteEvent[]; pagination: { page_count: number; page_number: number } }> {
  const { organizationId } = getConfig()
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.page) params.set('page', String(options.page))
  return eventbriteFetch(`/organizations/${organizationId}/events?${params}`)
}

/** Get event details */
export async function getEventbriteEvent(eventId: string): Promise<EventbriteEvent> {
  return eventbriteFetch<EventbriteEvent>(`/events/${eventId}`)
}

/** Create an event */
export async function createEventbriteEvent(event: {
  name: string
  description?: string
  start: { timezone: string; utc: string }
  end: { timezone: string; utc: string }
  currency: string
  capacity?: number
  online_event?: boolean
}): Promise<EventbriteEvent> {
  return eventbriteFetch<EventbriteEvent>('/events/', {
    method: 'POST',
    body: JSON.stringify({
      event: {
        name: { html: event.name },
        description: event.description ? { html: event.description } : undefined,
        start: event.start,
        end: event.end,
        currency: event.currency,
        capacity: event.capacity,
        online_event: event.online_event ?? false,
      },
    }),
  })
}

/** Publish an event (make it live) */
export async function publishEventbriteEvent(eventId: string): Promise<void> {
  await eventbriteFetch(`/events/${eventId}/publish/`, { method: 'POST' })
}

// ── Attendees ──

/** List attendees for an event */
export async function listEventbriteAttendees(
  eventId: string,
  options?: { status?: string; page?: number }
): Promise<{ attendees: EventbriteAttendee[]; pagination: { page_count: number } }> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.page) params.set('page', String(options.page))
  return eventbriteFetch(`/events/${eventId}/attendees?${params}`)
}

// ── Ticket Classes ──

/** Create a ticket type for an event */
export async function createEventbriteTicketClass(eventId: string, ticket: {
  name: string
  free?: boolean
  quantity_total?: number
  description?: string
}): Promise<any> {
  return eventbriteFetch(`/events/${eventId}/ticket_classes/`, {
    method: 'POST',
    body: JSON.stringify({
      ticket_class: {
        name: ticket.name,
        free: ticket.free ?? true,
        quantity_total: ticket.quantity_total || 100,
        description: ticket.description,
      },
    }),
  })
}
