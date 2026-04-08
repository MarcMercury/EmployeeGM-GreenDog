/**
 * Google Analytics 4 (GA4) - Server Utility
 * ============================================
 * Track app usage, feature adoption, and get reports.
 *
 * Setup: https://analytics.google.com/ → Admin → Data Streams → Measurement Protocol
 */
import type { GA4Event, GA4ReportRequest, GA4ReportResponse } from '~/types/external-apis.types'

const MEASUREMENT_URL = 'https://www.google-analytics.com/mp/collect'
const REPORTING_URL = 'https://analyticsdata.googleapis.com/v1beta'

function getMeasurementConfig(): { measurementId: string; apiSecret: string } {
  const config = useRuntimeConfig()
  if (!config.ga4MeasurementId || !config.ga4ApiSecret) {
    throw new Error('GA4 Measurement Protocol credentials not configured')
  }
  return { measurementId: config.ga4MeasurementId, apiSecret: config.ga4ApiSecret }
}

/** Send server-side event via Measurement Protocol */
export async function trackGA4Event(
  clientId: string,
  events: GA4Event[],
  userId?: string
): Promise<void> {
  const { measurementId, apiSecret } = getMeasurementConfig()

  await $fetch(`${MEASUREMENT_URL}?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      ...(userId && { user_id: userId }),
      events: events.map(e => ({
        name: e.name,
        params: e.params || {},
      })),
    }),
  }).catch(err => {
    console.warn('[GA4] Event tracking failed:', err)
  })
}

/** Track a single event (convenience wrapper) */
export async function trackGA4(
  clientId: string,
  eventName: string,
  params?: Record<string, string | number | boolean>,
  userId?: string
): Promise<void> {
  return trackGA4Event(clientId, [{ name: eventName, params }], userId)
}

/**
 * Run a GA4 Data API report (requires Google service account with Analytics access).
 * Uses the same service account token approach as Google Calendar.
 */
export async function runGA4Report(
  propertyId: string,
  request: GA4ReportRequest
): Promise<GA4ReportResponse> {
  const config = useRuntimeConfig()
  // This requires a service account token — same as Google Calendar
  // In production, share the auth layer
  const credentials = JSON.parse(config.googleServiceAccountJson || '{}')
  if (!credentials.client_email) throw new Error('Google service account not configured for GA4 reporting')

  // Placeholder: needs proper OAuth token (shared with google-calendar.ts)
  const token = '' // getGoogleAccessToken() — share from google-calendar.ts

  return $fetch<GA4ReportResponse>(
    `${REPORTING_URL}/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )
}
