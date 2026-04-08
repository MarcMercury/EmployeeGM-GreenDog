/**
 * useHubSpot - Composable
 * =========================
 * Frontend composable for HubSpot CRM operations.
 */
export function useHubSpot() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const contacts = ref<any[]>([])
  const deals = ref<any[]>([])

  async function fetchContacts(options?: { limit?: number; properties?: string[] }) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/hubspot/contacts', { params: options }) as any
      contacts.value = result.results || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch contacts'
    } finally {
      loading.value = false
    }
  }

  async function createContact(properties: Record<string, string>) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/hubspot/contacts', {
        method: 'POST',
        body: { properties },
      })
      return result
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create contact'
      return null
    } finally {
      loading.value = false
    }
  }

  async function searchContacts(query: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/hubspot/contacts/search', {
        params: { q: query },
      }) as any
      return result.results || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to search contacts'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchDeals(options?: { limit?: number }) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/hubspot/deals', { params: options }) as any
      deals.value = result.results || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch deals'
    } finally {
      loading.value = false
    }
  }

  async function createDeal(properties: Record<string, string>) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/hubspot/deals', {
        method: 'POST',
        body: { properties },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create deal'
      return null
    } finally {
      loading.value = false
    }
  }

  return { contacts, deals, loading, error, fetchContacts, createContact, searchContacts, fetchDeals, createDeal }
}
