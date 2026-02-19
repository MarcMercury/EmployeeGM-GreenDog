// =============================================================================
// Venice Paparazzi Event Scraper (Recent Events Covered)
// https://www.venicepaparazzi.com/recent-events-covered/sunsoutvenice/
// =============================================================================

import { EventScraper } from './base'

export class VenicePararazziScraper extends EventScraper {
  name = 'Venice Paparazzi'
  url = 'https://www.venicepaparazzi.com/recent-events-covered/sunsoutvenice/'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Venice Paparazzi covers local events - look for post listings
    const eventElements = $(
      '.event, .event-item, .post, article, [data-event], .gallery-item, .entry',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        // Try various title selectors
        const name = $event.find('h1, h2, h3, .title, .entry-title').first().text()?.trim() || ''

        // Date might be in metadata or text
        const dateText =
          $event.find('.date, time, .entry-date').text()?.trim() || ''

        const locationText = $event.find('.location, .venue').text()?.trim() || 'Venice'

        const descText =
          $event.find('.description, .content, .entry-content, p').first().text()?.trim() || ''

        // Get the event link
        const linkEl = $event.find('a[href]').first()
        const detailsUrl = linkEl.attr('href')
          ? new URL(linkEl.attr('href')!, this.url).toString()
          : this.url

        if (name && (dateText || descText)) {
          events.push({
            name,
            description: this.sanitizeText(descText),
            event_date: this.parseDate(dateText || new Date().toISOString()),
            location: this.sanitizeText(locationText),
            external_links: [
              {
                title: 'Suns Out Venice Event Coverage',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Venice Paparazzi / Suns Out Venice',
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Venice Paparazzi event:', error)
      }
    })

    return events
  }
}
