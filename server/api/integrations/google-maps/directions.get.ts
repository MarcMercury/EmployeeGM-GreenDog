/**
 * Google Maps Directions API Endpoint
 * =====================================
 * Get turn-by-turn directions and route polyline
 * 
 * GET /api/integrations/google-maps/directions?origin=Venice,CA&destination=Sherman+Oaks,CA
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  
  const origin = query.origin as string
  const destination = query.destination as string
  const waypoints = query.waypoints as string | undefined
  const mode = (query.mode as string) || 'driving'
  const avoid = query.avoid as string | undefined
  const departureTime = query.departure_time as string | undefined

  if (!origin || !destination) {
    throw createError({
      statusCode: 400,
      message: 'Origin and destination required'
    })
  }

  if (!config.googleMapsApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Google Maps API key not configured'
    })
  }

  const params: Record<string, string> = {
    origin,
    destination,
    mode,
    key: config.googleMapsApiKey
  }

  if (waypoints) params.waypoints = waypoints
  if (avoid) params.avoid = avoid
  if (departureTime) params.departure_time = departureTime

  const result = await $fetch<{
    routes: Array<{
      summary: string
      legs: Array<{
        start_address: string
        end_address: string
        distance: { text: string; value: number }
        duration: { text: string; value: number }
        duration_in_traffic?: { text: string; value: number }
        steps: Array<{
          html_instructions: string
          distance: { text: string; value: number }
          duration: { text: string; value: number }
          travel_mode: string
        }>
      }>
      overview_polyline: { points: string }
      bounds: {
        northeast: { lat: number; lng: number }
        southwest: { lat: number; lng: number }
      }
    }>
    status: string
  }>('https://maps.googleapis.com/maps/api/directions/json', { params })

  if (result.status !== 'OK' || !result.routes.length) {
    throw createError({
      statusCode: 404,
      message: `Could not find route: ${result.status}`
    })
  }

  const route = result.routes[0]
  const leg = route.legs[0]

  return {
    summary: route.summary,
    distance: leg.distance,
    duration: leg.duration,
    duration_in_traffic: leg.duration_in_traffic,
    start_address: leg.start_address,
    end_address: leg.end_address,
    steps: leg.steps,
    polyline: route.overview_polyline.points,
    bounds: route.bounds
  }
})
