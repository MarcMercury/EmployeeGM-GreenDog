// =============================================================================
// Event Insertion Service
// Manages inserting scraped events into the database
// =============================================================================

import { Database } from '~/types/database.types'
import type { ScrapedEvent } from './index'

type MarketingEvent = Database['public']['Tables']['marketing_events']['Insert']

interface EventInsertionResult {
  id: string
  name: string
  status: 'created' | 'updated' | 'skipped'
  reason?: string
}

export class EventInsertionService {
  private supabase: any // Will be injected with actual Supabase client

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Normalizes and prepared scraped event for insertion into database
   */
  private normalizeEvent(scrapedEvent: ScrapedEvent): MarketingEvent {
    return {
      name: scrapedEvent.name,
      description: scrapedEvent.description || null,
      event_type: scrapedEvent.event_type || 'general',
      event_date: scrapedEvent.event_date,
      start_time: scrapedEvent.start_time || null,
      end_time: scrapedEvent.end_time || null,
      location: scrapedEvent.location || null,
      contact_name: scrapedEvent.contact_name || null,
      contact_email: scrapedEvent.contact_email || null,
      contact_phone: scrapedEvent.contact_phone || null,
      hosted_by: scrapedEvent.hosted_by || null,
      registration_required: scrapedEvent.registration_required || false,
      registration_link: scrapedEvent.registration_link || null,
      notes: scrapedEvent.notes || null,
      status: 'planned',
      staffing_status: 'planned',
      event_cost: null,
      payment_status: 'pending',
      is_auto_scraped: true,
      source_url: scrapedEvent.source_url || null,
      source_name: scrapedEvent.hosted_by || null,
      external_links: scrapedEvent.external_links || [],
      communication_log: [
        {
          date: new Date().toISOString(),
          type: 'created',
          contact: 'Auto-Scraper',
          summary: `Event automatically scraped from ${scrapedEvent.source_url}`,
        },
      ],
    }
  }

  /**
   * Check if event already exists (by name and date)
   */
  async eventExists(name: string, eventDate: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('marketing_events')
        .select('id')
        .eq('name', name)
        .eq('event_date', eventDate)
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking event existence:', error)
      return false
    }
  }

  /**
   * Insert a single scraped event into the database
   */
  async insertEvent(scrapedEvent: ScrapedEvent): Promise<EventInsertionResult> {
    try {
      // Check if event already exists
      const exists = await this.eventExists(scrapedEvent.name, scrapedEvent.event_date)
      if (exists) {
        return {
          id: '',
          name: scrapedEvent.name,
          status: 'skipped',
          reason: 'Event with same name and date already exists',
        }
      }

      // Normalize and insert
      const normalizedEvent = this.normalizeEvent(scrapedEvent)

      const { data, error } = await this.supabase
        .from('marketing_events')
        .insert([normalizedEvent])
        .select('id')
        .single()

      if (error) throw error

      return {
        id: data.id,
        name: scrapedEvent.name,
        status: 'created',
      }
    } catch (error) {
      console.error(`Error inserting event ${scrapedEvent.name}:`, error)
      throw error
    }
  }

  /**
   * Batch insert multiple events
   */
  async insertEvents(scrapedEvents: ScrapedEvent[]): Promise<EventInsertionResult[]> {
    const results: EventInsertionResult[] = []

    for (const event of scrapedEvents) {
      try {
        const result = await this.insertEvent(event)
        results.push(result)
      } catch (error) {
        console.error(`Failed to insert event: ${event.name}`, error)
        results.push({
          id: '',
          name: event.name,
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Insert events from multiple sources
   */
  async insertFromSources(
    sourceResults: Array<{
      source: string
      success: boolean
      events: ScrapedEvent[]
      error?: string
    }>,
  ) {
    const allResults = {
      total_events: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      by_source: {} as Record<string, any>,
    }

    for (const sourceResult of sourceResults) {
      if (!sourceResult.success) {
        console.warn(`Skipping ${sourceResult.source}: ${sourceResult.error}`)
        allResults.by_source[sourceResult.source] = {
          success: false,
          error: sourceResult.error,
        }
        continue
      }

      try {
        const insertResults = await this.insertEvents(sourceResult.events)
        const created = insertResults.filter((r) => r.status === 'created').length
        const skipped = insertResults.filter((r) => r.status === 'skipped').length

        allResults.total_events += sourceResult.events.length
        allResults.created += created
        allResults.skipped += skipped
        allResults.by_source[sourceResult.source] = {
          success: true,
          total: sourceResult.events.length,
          created,
          skipped,
          results: insertResults,
        }
      } catch (error) {
        console.error(`Error inserting events from ${sourceResult.source}:`, error)
        allResults.by_source[sourceResult.source] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        allResults.failed += sourceResult.events.length
      }
    }

    return allResults
  }
}
