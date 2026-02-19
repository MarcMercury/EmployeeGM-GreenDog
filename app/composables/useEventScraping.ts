// =============================================================================
// Composable: useEventScraping
// Manages event scraping functionality for the marketing calendar
// =============================================================================

interface ScrapedEventSummary {
  source: string
  success: boolean
  events_found: number
  error?: string
}

interface InsertionSummary {
  total_events: number
  created: number
  skipped: number
  failed: number
  by_source: Record<string, any>
}

export const useEventScraping = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const scrapingResults = ref<ScrapedEventSummary[]>([])
  const insertionResults = ref<InsertionSummary | null>(null)

  /**
   * Manually trigger event scraping
   */
  const triggerScraping = async (options: {
    sources?: string[]
    insert?: boolean
  } = {}) => {
    loading.value = true
    error.value = null
    scrapingResults.value = []
    insertionResults.value = null

    try {
      const response = await $fetch('/api/marketing/scrape-events', {
        method: 'POST',
        body: {
          sources: options.sources,
          insert: options.insert !== false, // Default to true
        },
      })

      if (response.scraping) {
        scrapingResults.value = response.scraping.sources || []
      }

      if (response.insertion) {
        insertionResults.value = response.insertion
      }

      return {
        success: response.success,
        data: response,
      }
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.message || 'Failed to scrape events'
      error.value = message
      console.error('Event scraping error:', message)

      return {
        success: false,
        error: message,
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Scrape from specific source only
   */
  const scrapeSource = async (sourceName: string, insert = true) => {
    return triggerScraping({
      sources: [sourceName],
      insert,
    })
  }

  /**
   * Get all available scraper sources
   */
  const getAvailableSources = () => [
    'Main Street Santa Monica',
    'Venice Chamber of Commerce',
    'Santa Monica Chamber',
    'Sherman Oaks Encino Chamber',
    'Dog People Co',
    'Venice Street Art',
    'Venice Paparazzi',
    'Venice Heritage Museum',
    'Venice Fest',
  ]

  /**
   * Fetch pending events awaiting approval
   */
  const fetchPendingEvents = async () => {
    try {
      const response = await $fetch('/api/marketing/pending-events')
      return response
    } catch (err: any) {
      console.error('Error fetching pending events:', err)
      return { success: false, events: [] }
    }
  }

  return {
    // State
    loading,
    error,
    scrapingResults,
    insertionResults,

    // Actions
    triggerScraping,
    scrapeSource,
    getAvailableSources,
    fetchPendingEvents,
  }
}
