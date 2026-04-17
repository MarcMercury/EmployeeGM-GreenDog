/**
 * Google Maps Distance Matrix API Endpoint
 * ==========================================
 * Calculate driving distance and duration between locations
 * 
 * GET /api/integrations/google-maps/distance?origin=Venice,CA&destination=Sherman+Oaks,CA
 * GET /api/integrations/google-maps/distance?origins=A|B&destinations=C|D&mode=driving
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  // Support single origin/destination or multiple (pipe-separated)
  const originsParam = (query.origins || query.origin) as string | undefined
  const destinationsParam = (query.destinations || query.destination) as string | undefined
  const mode = (query.mode as 'driving' | 'walking' | 'bicycling' | 'transit') || 'driving'

  if (!originsParam || !destinationsParam) {
    throw createError({
      statusCode: 400,
      message: 'Origin and destination required'
    })
  }

  const origins = originsParam.split('|').filter(Boolean)
  const destinations = destinationsParam.split('|').filter(Boolean)

  if (origins.length === 0 || destinations.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'At least one origin and destination required'
    })
  }

  const results = await getDistanceMatrix(origins, destinations, mode)
  
  // For single queries, return simplified response
  if (origins.length === 1 && destinations.length === 1 && results.length === 1) {
    return results[0]
  }

  return { results }
})
