// =============================================================================
// API Endpoint: Manual Event Scraping Trigger
// POST /api/marketing/scrape-events
// Allows manual triggering of event scraping from external sources
// =============================================================================

import { eventScraperAggregator } from '../../utils/event-scrapers'
import { EventInsertionService } from '../../utils/event-insertion.service'

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
    .eq('auth_user_id', user.id)
    .single()

  const isAdmin =
    profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'marketing_admin'

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

    // Create calendar notes and notify admins for newly created events
    if (insert && insertionResults?.created > 0) {
      const createdEvents: Array<{ name: string; date: string; source: string }> = []

      for (const [sourceName, sourceData] of Object.entries(insertionResults.by_source)) {
        const sd = sourceData as any
        if (sd.success && sd.results) {
          for (const r of sd.results) {
            if (r.status === 'created') {
              const sourceResult = scraperResults.find((sr: any) => sr.source === sourceName)
              const originalEvent = sourceResult?.events?.find((e: any) => e.name === r.name)
              if (originalEvent?.event_date) {
                createdEvents.push({
                  name: r.name,
                  date: originalEvent.event_date,
                  source: sourceName,
                })
              }
            }
          }
        }
      }

      // Insert calendar notes
      for (const evt of createdEvents) {
        await supabase
          .from('marketing_calendar_notes')
          .insert({
            note_date: evt.date,
            title: `🔍 ${evt.name}`,
            content: `Source: ${evt.source}\nManually triggered scrape on ${new Date().toLocaleDateString()}`,
            color: 'teal',
          })
      }

      // Notify admins
      if (createdEvents.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['super_admin', 'admin', 'marketing_admin', 'sup_admin'])

        if (adminProfiles?.length) {
          const eventNames = createdEvents.map(e => e.name).slice(0, 5)
          const moreCount = createdEvents.length > 5 ? ` and ${createdEvents.length - 5} more` : ''

          const notificationRows = adminProfiles.map((p: any) => ({
            profile_id: p.id,
            type: 'scraped_events_added',
            category: 'marketing',
            title: `📅 ${createdEvents.length} New Event${createdEvents.length === 1 ? '' : 's'} Scraped`,
            body: `Event scraping found ${createdEvents.length} new event${createdEvents.length === 1 ? '' : 's'}: ${eventNames.join(', ')}${moreCount}. Notes have been added to the Marketing Calendar.`,
            data: {
              events_created: createdEvents.length,
              event_names: eventNames,
              url: '/marketing/calendar',
              action_label: 'View Calendar',
            },
            is_read: false,
            requires_action: false,
          }))

          await supabase.from('notifications').insert(notificationRows)
        }
      }
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
