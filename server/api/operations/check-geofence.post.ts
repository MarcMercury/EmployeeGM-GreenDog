/**
 * POST /api/operations/check-geofence
 * 
 * Server-side geofence validation for time punch clock-in/out.
 * Prevents client-side bypass of geofence checks — the server
 * fetches active geofences and computes haversine distance itself.
 * 
 * Requires authentication.
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional()
})

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid coordinates: ' + parsed.error.issues.map(i => i.message).join(', ')
    })
  }

  const { latitude, longitude } = parsed.data
  const supabase = await serverSupabaseClient(event)

  // Fetch active geofences from DB (server-side — not from client)
  const { data: geofences, error } = await supabase
    .from('geofences')
    .select('id, name, latitude, longitude, radius_meters, is_active')
    .eq('is_active', true)

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch geofences' })
  }

  if (!geofences || geofences.length === 0) {
    // No geofences configured — allow clock-in without geofence constraint
    return {
      geofence_id: null,
      within_geofence: null,
      violation_reason: null
    }
  }

  // Check each active geofence
  for (const fence of geofences) {
    if (fence.latitude != null && fence.longitude != null) {
      const distance = haversineDistance(
        latitude,
        longitude,
        fence.latitude,
        fence.longitude
      )

      if (distance <= fence.radius_meters) {
        return {
          geofence_id: fence.id,
          within_geofence: true,
          violation_reason: null,
          matched_fence: fence.name,
          distance_meters: Math.round(distance)
        }
      }
    }
  }

  // No geofence matched
  return {
    geofence_id: null,
    within_geofence: false,
    violation_reason: 'Location is outside all defined geofences'
  }
})
