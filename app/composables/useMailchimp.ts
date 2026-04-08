/**
 * useMailchimp - Composable
 * ===========================
 * Frontend composable for Mailchimp email campaigns.
 */
export function useMailchimp() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const audiences = ref<any[]>([])
  const campaigns = ref<any[]>([])

  async function fetchAudiences() {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/mailchimp/audiences') as any
      audiences.value = result.lists || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch audiences'
    } finally {
      loading.value = false
    }
  }

  async function addSubscriber(listId: string, email: string, mergeFields?: Record<string, string>, tags?: string[]) {
    error.value = null
    try {
      return await $fetch('/api/integrations/mailchimp/members', {
        method: 'POST',
        body: { listId, email, mergeFields, tags },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to add subscriber'
      return null
    }
  }

  async function fetchCampaigns(status?: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/mailchimp/campaigns', { params: { status } }) as any
      campaigns.value = result.campaigns || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch campaigns'
    } finally {
      loading.value = false
    }
  }

  async function createCampaign(data: {
    listId: string; subjectLine: string; fromName: string; replyTo: string
  }) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/mailchimp/campaigns', {
        method: 'POST',
        body: data,
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create campaign'
      return null
    } finally {
      loading.value = false
    }
  }

  return { audiences, campaigns, loading, error, fetchAudiences, addSubscriber, fetchCampaigns, createCampaign }
}
