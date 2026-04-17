/**
 * Google Maps Places API Endpoint
 * =================================
 * Search for nearby places by location and type
 * 
 * GET /api/integrations/google-maps/places?lat=34.1536&lng=-118.4426&radius=1000&type=veterinary_care
 */
import { searchNearbyPlaces, getPlaceDetails } from '~/server/utils/google-maps'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const placeId = query.placeId as string | undefined
  
  // Get place details if placeId provided
  if (placeId) {
    const details = await getPlaceDetails(placeId)
    return details
  }

  // Otherwise search nearby places
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)
  const radius = parseInt(query.radius as string) || 1000
  const type = query.type as string | undefined
  const keyword = query.keyword as string | undefined

  if (isNaN(lat) || isNaN(lng)) {
    throw createError({
      statusCode: 400,
      message: 'Valid lat and lng required'
    })
  }

  const places = await searchNearbyPlaces(lat, lng, radius, type, keyword)
  
  return places
})
