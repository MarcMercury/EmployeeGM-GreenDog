// =============================================================================
// Santa Monica Chamber of Commerce Event Scraper
// https://members.smchamber.com/events
// =============================================================================

import { EventScraper } from './base'

export class SantaMonicaChamberScraper extends EventScraper {
  name = 'Santa Monica Chamber'
  url = 'https://members.smchamber.com/events'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Member portals typically have structured event listings
    const eventElements = $(
      '.event, .event-item, .event-card, [data-event-id], .listing-item, table tbody tr',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        // Extract common event attributes
        const name =
          $event.find('.event-name, .event-title, .name, a').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, td:nth-child(1)').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time, td:nth-child(2)').text()?.trim() || ''

        const locationText = $event.find('.event-location, .location, td:nth-child(3)').text()?.trim() || ''

        const descText =
          $event.find('.event-description, .description, td:nth-child(4)').text()?.trim() || ''

        const linkEl = $event.find('a[href]').first()
        const detailsUrl = linkEl.attr('href')
          ? new URL(linkEl.attr('href')!, this.url).toString()
          : this.url

        if (name && dateText) {
          events.push({
            name,
            description: this.sanitizeText(descText),
            event_date: this.parseDate(dateText),
            start_time: this.parseTime(timeText),
            location: this.sanitizeText(locationText),
            external_links: [
              {
                title: 'Chamber Event',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Santa Monica Chamber of Commerce',
            registration_required: true,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Santa Monica Chamber event:', error)
      }
    })

    return events
  }
}
