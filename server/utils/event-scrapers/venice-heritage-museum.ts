// =============================================================================
// Venice Heritage Museum Event Scraper
// https://www.veniceheritagemuseum.org/upcoming-events.html
// =============================================================================

import { EventScraper } from './base'

export class VeniceHeritageMuseumScraper extends EventScraper {
  name = 'Venice Heritage Museum'
  url = 'https://www.veniceheritagemuseum.org/upcoming-events.html'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Museums typically structure their event pages clearly
    const eventElements = $(
      '.event, .event-item, .upcoming-event, [data-event], .listing, .event-entry, article',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        const name = $event.find('.event-title, .title, h2, h3').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, time').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time').text()?.trim() || ''

        const locationText =
          $event.find('.event-location, .location, .venue').text()?.trim() ||
          'Venice Heritage Museum'

        const descText =
          $event.find('.event-description, .description, .content, p').text()?.trim() || ''

        const linkEl = $event.find('a[href]').first()
        const detailsUrl = linkEl.attr('href')
          ? new URL(linkEl.attr('href')!, this.url).toString()
          : this.url

        const contactText = $event.find('.contact, .email, .phone').text()?.trim() || ''

        if (name && dateText) {
          events.push({
            name,
            description: this.sanitizeText(descText),
            event_date: this.parseDate(dateText),
            start_time: this.parseTime(timeText),
            location: this.sanitizeText(locationText),
            contact_email: contactText.includes('@') ? contactText : undefined,
            external_links: [
              {
                title: 'Museum Event',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Venice Heritage Museum',
            registration_required: false,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Venice Heritage Museum event:', error)
      }
    })

    return events
  }
}
