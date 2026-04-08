/**
 * useGoogleMaps - Composable
 * ============================
 * Frontend composable for geocoding, distance calculations, and geofencing.
 */
export function useGoogleMaps() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function geocode(address: string) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/google-maps/geocode', {
        params: { address },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Geocoding failed'
      return null
    } finally {
      loading.value = false
    }
  }

  async function getDistance(origin: string, destination: string) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/google-maps/distance', {
        params: { origin, destination },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Distance calculation failed'
      return null
    } finally {
      loading.value = false
    }
  }

  async function findNearbyPlaces(lat: number, lng: number, radius: number, type?: string) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/google-maps/places', {
        params: { lat, lng, radius, type },
      }) as any[]
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Place search failed'
      return []
    } finally {
      loading.value = false
    }
  }

  /** Client-side geofence check (no API call needed) */
  function isWithinGeofence(
    pointLat: number, pointLng: number,
    centerLat: number, centerLng: number,
    radiusMeters: number
  ): boolean {
    const R = 6371000
    const dLat = (pointLat - centerLat) * Math.PI / 180
    const dLng = (pointLng - centerLng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(centerLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c <= radiusMeters
  }

  return { loading, error, geocode, getDistance, findNearbyPlaces, isWithinGeofence }
}
