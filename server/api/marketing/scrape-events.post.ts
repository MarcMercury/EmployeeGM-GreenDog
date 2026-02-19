// =============================================================================
// API Endpoint: Manual Event Scraping Trigger
// POST /api/marketing/scrape-events
// Allows manual triggering of event scraping from external sources
// =============================================================================

import { eventScraperAggregator } from '~/server/utils/event-scrapers'
import { EventInsertionService } from '~/server/utils/event-insertion.service'

export default defineEventHandler(async (event) => {
  // Check authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // Check authorization - must be marketing admin
  const supabase = serverSupabaseClient(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'marketing_admin' || profile?.role === 'partner'

  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only marketing admins can trigger event scraping',
    })
  }

  try {
    const body = await readBody(event)
    const { sources, insert = true } = body || {}

    console.log(`🔍 Starting event scraping (sources: ${sources ? sources.join(', ') : 'all'})...`)

    // Scrape specific sources or all
    let scraperResults
    if (sources && Array.isArray(sources) && sources.length > 0) {
      scraperResults = []
      for (const source of sources) {
        try {
          const scrapedEvents = await eventScraperAggregator.scrapeSource(source)
          scraperResults.push({
            source,
            success: true,
            events: scrapedEvents,
          })
        } catch (error) {
          scraperResults.push({
            source,
            success: false,
            events: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } else {
      scraperResults = await eventScraperAggregator.scrapeAllSources()
    }

    let insertionResults = null

    // Insert events if requested
    if (insert) {
      const insertionService = new EventInsertionService(supabase)
      insertionResults = await insertionService.insertFromSources(scraperResults)
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      scraping: {
        total_sources: scraperResults.length,
        successful: scraperResults.filter((r) => r.success).length,
        failed: scraperResults.filter((r) => !r.success).length,
        total_events_found: scraperResults.reduce((sum, r) => sum + r.events.length, 0),
        sources: scraperResults.map((r) => ({
          name: r.source,
          success: r.success,
          events_found: r.events.length,
          error: r.error,
        })),
      },
      insertion: insertionResults,
      events: scraperResults.flatMap((r) => r.events),
    }
  } catch (error) {
    console.error('❌ Error in event scraping endpoint:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to scrape events',
    })
  }
})
