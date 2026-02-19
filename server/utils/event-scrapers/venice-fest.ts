// =============================================================================
// Venice Fest Event Scraper
// https://www.thevenicefest.com/
// =============================================================================

import { EventScraper } from './base'

export class VeniceFestScraper extends EventScraper {
  name = 'Venice Fest'
  url = 'https://www.thevenicefest.com/'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Festival websites typically highlight events prominently
    const eventElements = $(
      '.event, .event-item, .fest-event, [data-event], .schedule-item, .event-card, article',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        const name = $event.find('.event-title, .title, h2, h3, .name').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, time').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time').text()?.trim() || ''

        const locationText =
          $event.find('.event-location, .location, .venue, .stage').text()?.trim() || 'Venice'

        const descText =
          $event.find('.event-description, .description, .content, p').text()?.trim() || ''

        const linkEl = $event.find('a[href]').first()
        const detailsUrl = linkEl.attr('href')
          ? new URL(linkEl.attr('href')!, this.url).toString()
          : this.url

        if (name && (dateText || descText)) {
          events.push({
            name,
            description: this.sanitizeText(descText),
            event_date: this.parseDate(dateText || new Date().toISOString()),
            start_time: this.parseTime(timeText),
            location: this.sanitizeText(locationText),
            external_links: [
              {
                title: 'Venice Fest Event',
                url: detailsUrl,
              },
            ],
            event_type: 'street_fair',
            hosted_by: 'Venice Fest',
            registration_required: false,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Venice Fest event:', error)
      }
    })

    return events
  }
}
