/**
 * Google Business Profile API - Server Utility
 * ================================================
 * Manage clinic online presence, respond to reviews, update hours.
 *
 * Setup: https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com
 */
import type { GoogleBusinessLocation, GoogleBusinessReview } from '~/types/external-apis.types'

const BASE_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const REVIEWS_URL = 'https://mybusiness.googleapis.com/v4'

/** Uses same Google service account token as Calendar/Drive */
async function getAccessToken(): Promise<string> {
  const config = useRuntimeConfig()
  const credentials = JSON.parse(config.googleServiceAccountJson || '{}')
  if (!credentials.client_email) throw new Error('Google service account not configured')
  // Share token with google-calendar.ts / google-drive.ts in production
  throw new Error('Implement shared Google OAuth token provider')
}

async function gbpFetch<T>(url: string, path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  return $fetch<T>(`${url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** List all business locations */
export async function listGoogleBusinessLocations(accountId: string): Promise<GoogleBusinessLocation[]> {
  const result = await gbpFetch<{ locations: GoogleBusinessLocation[] }>(
    BASE_URL, `/accounts/${accountId}/locations`
  )
  return result.locations || []
}

/** Update business hours */
export async function updateBusinessHours(
  locationName: string,
  hours: { periods: { openDay: string; openTime: string; closeDay: string; closeTime: string }[] }
): Promise<GoogleBusinessLocation> {
  return gbpFetch<GoogleBusinessLocation>(BASE_URL, `/${locationName}`, {
    method: 'PATCH',
    body: JSON.stringify({ regularHours: hours }),
  })
}

/** Get reviews for a location */
export async function getGoogleBusinessReviews(
  accountId: string,
  locationId: string,
  pageSize = 50
): Promise<{ reviews: GoogleBusinessReview[]; totalReviewCount: number; averageRating: number }> {
  return gbpFetch(
    REVIEWS_URL,
    `/accounts/${accountId}/locations/${locationId}/reviews?pageSize=${pageSize}`
  )
}

/** Reply to a review */
export async function replyToGoogleReview(
  accountId: string,
  locationId: string,
  reviewId: string,
  comment: string
): Promise<void> {
  await gbpFetch(
    REVIEWS_URL,
    `/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    }
  )
}
