// =============================================================================
// Event Scraper - Main Index
// Aggregates all event scraping sources
// =============================================================================

import { MainStreetSMScraper } from './mainstreet-sm'
import { VeniceChamberScraper } from './venice-chamber'
import { SantaMonicaChamberScraper } from './santa-monica-chamber'
import { ShermanOaksEncinoScraper } from './sherman-oaks-encino'
import { DogPeopleScraper } from './dog-people'
import { VeniceStreetArtScraper } from './vsa-la'
import { VenicePararazziScraper } from './venice-paparazzi'
import { VeniceHeritageMuseumScraper } from './venice-heritage-museum'
import { VeniceFestScraper } from './venice-fest'

export interface ScrapedEvent {
  name: string
  description: string
  event_date: string
  start_time?: string
  end_time?: string
  location?: string
  contact_email?: string
  contact_name?: string
  contact_phone?: string
  external_links: Array<{
    title: string
    url: string
    description?: string
  }>
  event_type: string
  hosted_by: string
  registration_link?: string
  registration_required?: boolean
  notes?: string
  source_url: string
}

export interface ScraperResult {
  source: string
  success: boolean
  events: ScrapedEvent[]
  error?: string
  lastRun?: string
}

class EventScraperAggregator {
  private scrapers = [
    new MainStreetSMScraper(),
    new VeniceChamberScraper(),
    new SantaMonicaChamberScraper(),
    new ShermanOaksEncinoScraper(),
    new DogPeopleScraper(),
    new VeniceStreetArtScraper(),
    new VenicePararazziScraper(),
    new VeniceHeritageMuseumScraper(),
    new VeniceFestScraper(),
  ]

  async scrapeAllSources(): Promise<ScraperResult[]> {
    const results: ScraperResult[] = []

    for (const scraper of this.scrapers) {
      try {
        console.log(`🔍 Scraping ${scraper.name}...`)
        const events = await scraper.scrape()
        results.push({
          source: scraper.name,
          success: true,
          events,
          lastRun: new Date().toISOString(),
        })
        console.log(`✓ Got ${events.length} events from ${scraper.name}`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`✗ Error scraping ${scraper.name}:`, errorMsg)
        results.push({
          source: scraper.name,
          success: false,
          events: [],
          error: errorMsg,
          lastRun: new Date().toISOString(),
        })
      }
    }

    return results
  }

  async scrapeSource(sourceName: string): Promise<ScrapedEvent[]> {
    const scraper = this.scrapers.find((s) => s.name.toLowerCase() === sourceName.toLowerCase())
    if (!scraper) {
      throw new Error(`Scraper for ${sourceName} not found`)
    }
    return scraper.scrape()
  }
}

export const eventScraperAggregator = new EventScraperAggregator()
