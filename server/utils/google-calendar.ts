/**
 * Google Calendar API - Server Utility
 * =====================================
 * Two-way sync employee schedules with Google Calendar.
 * Uses OAuth 2.0 service account for server-to-server access.
 *
 * Setup: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
 */
import type { GoogleCalendarEvent } from '~/types/external-apis.types'

const BASE_URL = 'https://www.googleapis.com/calendar/v3'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const config = useRuntimeConfig()
  const now = Date.now()

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const credentials = JSON.parse(config.googleServiceAccountJson || '{}')
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google service account credentials not configured')
  }

  // Build JWT for service account auth
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const iat = Math.floor(now / 1000)
  const claim = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  }))

  // In production, sign with private key using crypto module
  // For now, exchange via Google's token endpoint
  const response = await $fetch<{ access_token: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}`, // Needs proper RS256 signing in production
    }),
  })

  cachedToken = {
    token: response.access_token,
    expiresAt: now + (response.expires_in * 1000),
  }

  return cachedToken.token
}

export async function googleCalendarFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

export async function listCalendarEvents(calendarId: string, timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    ...(timeMin && { timeMin }),
    ...(timeMax && { timeMax }),
  })
  const result = await googleCalendarFetch<{ items: GoogleCalendarEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )
  return result.items || []
}

export async function createCalendarEvent(calendarId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
  return googleCalendarFetch<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(event) }
  )
}

export async function updateCalendarEvent(calendarId: string, eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
  return googleCalendarFetch<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(event) }
  )
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  await googleCalendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE' }
  )
}
