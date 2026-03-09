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

    // Create calendar notes for newly created events
    if (insertionResults.created > 0) {
      const createdEvents: Array<{ name: string; date: string; source: string }> = []

      for (const [sourceName, sourceData] of Object.entries(insertionResults.by_source)) {
        const sd = sourceData as any
        if (sd.success && sd.results) {
          for (const r of sd.results) {
            if (r.status === 'created') {
              // Find the original event data to get the date
              const sourceResult = scraperResults.find(sr => sr.source === sourceName)
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

      // Insert calendar notes for each newly created event
      for (const evt of createdEvents) {
        const { error: noteErr } = await supabase
          .from('marketing_calendar_notes')
          .insert({
            note_date: evt.date,
            title: `🔍 ${evt.name}`,
            content: `Source: ${evt.source}\nAutomatically discovered by Event Scraper on ${new Date().toLocaleDateString()}`,
            color: 'teal',
          })

        if (noteErr) {
          console.warn(`⚠️ Failed to create calendar note for ${evt.name}:`, noteErr.message)
        }
      }

      // Notify marketing_admin and admin users about the scraped events
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['super_admin', 'admin', 'marketing_admin', 'sup_admin'])

      if (adminProfiles?.length && createdEvents.length > 0) {
        const eventNames = createdEvents.map(e => e.name).slice(0, 5)
        const moreCount = createdEvents.length > 5 ? ` and ${createdEvents.length - 5} more` : ''

        const notificationRows = adminProfiles.map((p: any) => ({
          profile_id: p.id,
          type: 'scraped_events_added',
          category: 'marketing',
          title: `📅 ${createdEvents.length} New Event${createdEvents.length === 1 ? '' : 's'} Discovered`,
          body: `The Event Scraper found ${createdEvents.length} new event${createdEvents.length === 1 ? '' : 's'}: ${eventNames.join(', ')}${moreCount}. Notes have been added to the Marketing Calendar.`,
          data: {
            events_created: createdEvents.length,
            event_names: eventNames,
            url: '/marketing/calendar',
            action_label: 'View Calendar',
          },
          is_read: false,
          requires_action: false,
        }))

        const { error: notifErr } = await supabase
          .from('notifications')
          .insert(notificationRows)

        if (notifErr) {
          console.warn('⚠️ Failed to send scraper event notifications:', notifErr.message)
        } else {
          console.log(`📧 Notified ${adminProfiles.length} admin(s) about ${createdEvents.length} new event(s)`)
        }
      }
    }

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
