/**
 * useYelp - Composable
 * =======================
 * Frontend composable for Yelp review monitoring and competitor analysis.
 */
export function useYelp() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const reviews = ref<any[]>([])
  const competitors = ref<any[]>([])
  const clinicStats = ref<{ avgRating: number; totalReviews: number } | null>(null)

  async function fetchClinicReviews(businessId: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/yelp/reviews', {
        params: { businessId },
      }) as any
      reviews.value = result.reviews || []
      clinicStats.value = { avgRating: result.avgRating, totalReviews: result.totalReviews }
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch reviews'
    } finally {
      loading.value = false
    }
  }

  async function findNearbyCompetitors(location: string) {
    loading.value = true
    error.value = null
    try {
      competitors.value = await $fetch('/api/integrations/yelp/nearby', {
        params: { location },
      }) as any[]
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to find competitors'
    } finally {
      loading.value = false
    }
  }

  return { reviews, competitors, clinicStats, loading, error, fetchClinicReviews, findNearbyCompetitors }
}
