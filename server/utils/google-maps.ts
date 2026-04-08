/**
 * Google Maps / Places API - Server Utility
 * ============================================
 * Geocoding, distance calculations, geofencing, partner location mapping.
 * Free: $200/month credit (~28k geocode calls, ~40k distance calls).
 *
 * Setup: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com
 */
import type { GoogleMapsGeocode, GoogleMapsDistanceResult, GooglePlaceDetails } from '~/types/external-apis.types'

const MAPS_URL = 'https://maps.googleapis.com/maps/api'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.googleMapsApiKey) throw new Error('Google Maps API key not configured')
  return config.googleMapsApiKey
}

// ── Geocoding ──

/** Convert address to lat/lng */
export async function geocodeAddress(address: string): Promise<GoogleMapsGeocode | null> {
  const apiKey = getApiKey()
  const result = await $fetch<{ results: any[]; status: string }>(
    `${MAPS_URL}/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  )
  if (result.status !== 'OK' || !result.results.length) return null

  const r = result.results[0]
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formatted_address: r.formatted_address,
    place_id: r.place_id,
  }
}

/** Convert lat/lng to address */
export async function reverseGeocode(lat: number, lng: number): Promise<GoogleMapsGeocode | null> {
  const apiKey = getApiKey()
  const result = await $fetch<{ results: any[]; status: string }>(
    `${MAPS_URL}/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
  )
  if (result.status !== 'OK' || !result.results.length) return null

  const r = result.results[0]
  return {
    lat, lng,
    formatted_address: r.formatted_address,
    place_id: r.place_id,
  }
}

// ── Distance Matrix ──

/** Calculate driving distance and duration between locations */
export async function getDistanceMatrix(
  origins: string[],
  destinations: string[],
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<GoogleMapsDistanceResult[]> {
  const apiKey = getApiKey()
  const result = await $fetch<{
    rows: { elements: { distance: { text: string; value: number }; duration: { text: string; value: number }; status: string }[] }[]
    origin_addresses: string[]
    destination_addresses: string[]
  }>(`${MAPS_URL}/distancematrix/json`, {
    params: {
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode,
      key: apiKey,
    },
  })

  const results: GoogleMapsDistanceResult[] = []
  for (let i = 0; i < result.rows.length; i++) {
    for (let j = 0; j < result.rows[i].elements.length; j++) {
      const el = result.rows[i].elements[j]
      if (el.status === 'OK') {
        results.push({
          origin: result.origin_addresses[i],
          destination: result.destination_addresses[j],
          distance: el.distance,
          duration: el.duration,
        })
      }
    }
  }
  return results
}

// ── Places ──

/** Search for nearby places */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number,
  type?: string,
  keyword?: string
): Promise<GooglePlaceDetails[]> {
  const apiKey = getApiKey()
  const params: Record<string, string> = {
    location: `${lat},${lng}`,
    radius: String(radius),
    key: apiKey,
  }
  if (type) params.type = type
  if (keyword) params.keyword = keyword

  const result = await $fetch<{ results: any[] }>(`${MAPS_URL}/place/nearbysearch/json`, { params })
  return result.results || []
}

/** Get detailed place information */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
  const apiKey = getApiKey()
  const result = await $fetch<{ result: GooglePlaceDetails }>(
    `${MAPS_URL}/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry,rating,reviews,opening_hours&key=${apiKey}`
  )
  return result.result
}

// ── Geofencing Helper ──

/** Check if a point is within a radius of a center (meters) */
export function isWithinGeofence(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): boolean {
  const R = 6371000 // Earth radius in meters
  const dLat = (pointLat - centerLat) * Math.PI / 180
  const dLng = (pointLng - centerLng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(centerLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c <= radiusMeters
}
