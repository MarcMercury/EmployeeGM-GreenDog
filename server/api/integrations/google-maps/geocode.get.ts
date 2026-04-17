/**
 * Google Maps Geocoding API Endpoint
 * ====================================
 * Convert address string to lat/lng coordinates
 * 
 * GET /api/integrations/google-maps/geocode?address=123+Main+St
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const address = query.address as string | undefined
  const lat = query.lat as string | undefined
  const lng = query.lng as string | undefined

  // Reverse geocode if lat/lng provided
  if (lat && lng) {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng))
    if (!result) {
      throw createError({
        statusCode: 404,
        message: 'Could not reverse geocode coordinates'
      })
    }
    return result
  }

  // Forward geocode if address provided
  if (!address) {
    throw createError({
      statusCode: 400,
      message: 'Address or lat/lng required'
    })
  }

  const result = await geocodeAddress(address)
  
  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Could not geocode address'
    })
  }

  return result
})
