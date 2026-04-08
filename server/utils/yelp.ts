/**
 * Yelp Fusion API - Server Utility
 * ====================================
 * Monitor clinic reviews, find nearby competitors.
 * Free: 5,000 API calls/day.
 *
 * Setup: https://www.yelp.com/developers/v3/manage_app
 */
import type { YelpBusiness, YelpReview } from '~/types/external-apis.types'

const BASE_URL = 'https://api.yelp.com/v3'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.yelpApiKey) throw new Error('Yelp API key not configured')
  return config.yelpApiKey
}

async function yelpFetch<T>(path: string): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })
}

/** Search for businesses */
export async function searchYelpBusinesses(options: {
  term?: string
  location?: string
  latitude?: number
  longitude?: number
  radius?: number
  categories?: string
  sort_by?: 'best_match' | 'rating' | 'review_count' | 'distance'
  limit?: number
}): Promise<{ businesses: YelpBusiness[]; total: number }> {
  const params = new URLSearchParams()
  if (options.term) params.set('term', options.term)
  if (options.location) params.set('location', options.location)
  if (options.latitude) params.set('latitude', String(options.latitude))
  if (options.longitude) params.set('longitude', String(options.longitude))
  if (options.radius) params.set('radius', String(Math.min(options.radius, 40000)))
  if (options.categories) params.set('categories', options.categories)
  if (options.sort_by) params.set('sort_by', options.sort_by)
  params.set('limit', String(options.limit || 20))

  return yelpFetch(`/businesses/search?${params}`)
}

/** Get business details */
export async function getYelpBusiness(businessId: string): Promise<YelpBusiness> {
  return yelpFetch<YelpBusiness>(`/businesses/${businessId}`)
}

/** Get reviews for a business */
export async function getYelpReviews(businessId: string, sort_by?: 'yelp_sort' | 'newest'): Promise<{ reviews: YelpReview[] }> {
  const params = sort_by ? `?sort_by=${sort_by}` : ''
  return yelpFetch(`/businesses/${businessId}/reviews${params}`)
}

/** Search for veterinary clinics near a location */
export async function findNearbyVetClinics(location: string, radius = 16000): Promise<YelpBusiness[]> {
  const result = await searchYelpBusinesses({
    term: 'veterinarian',
    location,
    radius,
    categories: 'vet',
    sort_by: 'distance',
    limit: 50,
  })
  return result.businesses
}

/** Monitor reviews for a specific business (your clinic) */
export async function getClinicReviews(businessId: string): Promise<{
  reviews: YelpReview[]
  avgRating: number
  totalReviews: number
}> {
  const [business, reviewsResponse] = await Promise.all([
    getYelpBusiness(businessId),
    getYelpReviews(businessId, 'newest'),
  ])
  return {
    reviews: reviewsResponse.reviews,
    avgRating: business.rating,
    totalReviews: business.review_count,
  }
}
