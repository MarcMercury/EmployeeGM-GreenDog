// =============================================================================
// Cron Job: Scrape External Event Calendars
// Runs periodically to pull events from partner websites and insert them
// into the Marketing Calendar. Triggered daily at 6 AM UTC
// =============================================================================

import { eventScraperAggregator } from '../../utils/event-scrapers'
import { EventInsertionService } from '../../utils/event-insertion.service'

export default defineEventHandler(async (event) => {
  // Verify this is a legitimate cron request
  const secret = useRuntimeConfig().cronSecret
  const authHeader = getHeader(event, 'authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized cron request',
    })
  }

  try {
    console.log('📅 Starting external event calendar scraper...')

    // Initialize Supabase client
    const supabase = serverSupabaseClient(event)
    const insertionService = new EventInsertionService(supabase)

    // Scrape all sources
    const scraperResults = await eventScraperAggregator.scrapeAllSources()

    // Log scraping results
    console.log('🔍 Scraping complete:')
    for (const result of scraperResults) {
      if (result.success) {
        console.log(`  ✓ ${result.source}: ${result.events.length} events`)
      } else {
        console.log(`  ✗ ${result.source}: ${result.error}`)
      }
    }

    // Insert events into database
    console.log('💾 Inserting events into database...')
    const insertionResults = await insertionService.insertFromSources(scraperResults)

    console.log('✓ Event insertion complete:')
    console.log(`  Created: ${insertionResults.created}`)
    console.log(`  Skipped: ${insertionResults.skipped}`)
    console.log(`  Failed: ${insertionResults.failed}`)

    // Return summary
    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: insertionResults,
      details: scraperResults,
    }
  } catch (error) {
    console.error('❌ Error in event scraper cron:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
})
