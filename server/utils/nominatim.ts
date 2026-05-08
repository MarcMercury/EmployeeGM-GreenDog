/**
 * OpenStreetMap Nominatim — Server Utility
 * ==========================================
 * 100% free geocoding/reverse-geocoding. No API key.
 *
 * Use this when you need accurate coordinates for an address (e.g. to
 * enforce a radius filter on hospital staff pages discovered by an AI
 * scout) and you do NOT want to spend Google Maps quota.
 *
 * USAGE POLICY (https://operations.osmfoundation.org/policies/nominatim/):
 *   - MAXIMUM 1 request per second.
 *   - REQUIRED: a unique, identifying User-Agent or Referer header that
 *     describes the application + a contact (email or URL).
 *   - Cache results aggressively. Do NOT submit bulk geocoding jobs.
 *   - For heavy use, self-host or use a paid provider.
 *
 * We rate-limit to ~1 req/sec process-wide via a shared promise chain.
 */

import { logger } from './logger'
import { getAppUrl } from './appUrl'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const MIN_INTERVAL_MS = 1100   // a hair over 1s for safety

let lastRequestAt = 0
let rateChain: Promise<void> = Promise.resolve()

function userAgent(): string {
  const config = useRuntimeConfig()
  const explicit = (config as any).nominatimUserAgent as string | undefined
  if (explicit) return explicit
  // Fall back to APP_URL (Nominatim accepts a URL contact identifier).
  const appUrl = getAppUrl()
  return `EmployeeGM-GreenDog/1.0 (${appUrl})`
}

/** Schedule a function so that successive calls respect the 1 req/sec policy. */
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const now = Date.now()
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt))
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait))
    }
    lastRequestAt = Date.now()
    return fn()
  }
  const next = rateChain.then(run, run)
  // Keep the chain alive even if a call rejects.
  rateChain = next.then(() => undefined, () => undefined)
  return next
}

export interface NominatimResult {
  place_id: number
  licence?: string
  osm_type?: string
  osm_id?: number
  lat: string
  lon: string
  class?: string
  type?: string
  display_name: string
  address?: {
    road?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
  boundingbox?: string[]
}

export interface GeocodeResult {
  lat: number
  lng: number
  display_name: string
  city?: string | null
  state?: string | null
  country?: string | null
  postal_code?: string | null
  raw: NominatimResult
}

/** Geocode a free-form address. Returns the best match or null. */
export async function nominatimGeocode(address: string, opts?: { country?: string; limit?: number }): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null
  return schedule(async () => {
    try {
      const results = await $fetch<NominatimResult[]>(`${NOMINATIM_BASE}/search`, {
        method: 'GET',
        headers: { 'User-Agent': userAgent(), 'Accept': 'application/json' },
        query: {
          q: address.trim(),
          format: 'json',
          addressdetails: 1,
          limit: String(Math.min(opts?.limit ?? 1, 10)),
          ...(opts?.country ? { countrycodes: opts.country.toLowerCase() } : {}),
        },
      })
      const top = results?.[0]
      if (!top) return null
      return formatGeocodeResult(top)
    } catch (err) {
      logger.error('Nominatim geocode failed', err as Error, 'nominatim')
      return null
    }
  })
}

/** Geocode and return up to `limit` candidates. */
export async function nominatimGeocodeMany(address: string, limit = 5): Promise<GeocodeResult[]> {
  if (!address?.trim()) return []
  return schedule(async () => {
    try {
      const results = await $fetch<NominatimResult[]>(`${NOMINATIM_BASE}/search`, {
        method: 'GET',
        headers: { 'User-Agent': userAgent(), 'Accept': 'application/json' },
        query: {
          q: address.trim(),
          format: 'json',
          addressdetails: 1,
          limit: String(Math.min(Math.max(limit, 1), 10)),
        },
      })
      return (results ?? []).map(formatGeocodeResult)
    } catch (err) {
      logger.error('Nominatim geocode failed', err as Error, 'nominatim')
      return []
    }
  })
}

/** Reverse geocode lat/lng to an address. */
export async function nominatimReverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  return schedule(async () => {
    try {
      const result = await $fetch<NominatimResult>(`${NOMINATIM_BASE}/reverse`, {
        method: 'GET',
        headers: { 'User-Agent': userAgent(), 'Accept': 'application/json' },
        query: { lat, lon: lng, format: 'json', addressdetails: 1 },
      })
      if (!result?.lat || !result?.lon) return null
      return formatGeocodeResult(result)
    } catch (err) {
      logger.error('Nominatim reverse geocode failed', err as Error, 'nominatim')
      return null
    }
  })
}

function formatGeocodeResult(r: NominatimResult): GeocodeResult {
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    display_name: r.display_name,
    city: r.address?.city ?? r.address?.town ?? r.address?.village ?? null,
    state: r.address?.state ?? null,
    country: r.address?.country ?? null,
    postal_code: r.address?.postcode ?? null,
    raw: r,
  }
}

/** Haversine distance between two lat/lng pairs, in miles. */
export function distanceMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.7613   // Earth radius in miles
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const lat1 = aLat * Math.PI / 180
  const lat2 = bLat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

/** Convenience: distance in miles between two addresses (2 geocode calls). */
export async function distanceBetweenAddressesMiles(a: string, b: string): Promise<number | null> {
  const [g1, g2] = [await nominatimGeocode(a), await nominatimGeocode(b)]
  if (!g1 || !g2) return null
  return distanceMiles(g1.lat, g1.lng, g2.lat, g2.lng)
}
