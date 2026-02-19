// =============================================================================
// Dog People Co Event Scraper
// https://www.dogppl.co/calendar
// =============================================================================

import { EventScraper } from './base'

export class DogPeopleScraper extends EventScraper {
  name = 'Dog People Co'
  url = 'https://www.dogppl.co/calendar'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Dog People Co is a community space - look for event listings
    const eventElements = $(
      '.event, .event-item, [data-event], .calendar-event, .listing, .post-item',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        const name = $event.find('.event-title, .title, h2, h3, a').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, time').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time').text()?.trim() || ''

        const locationText =
          $event.find('.event-location, .location, .venue').text()?.trim() ||
          'Dog People Co, Los Angeles' ||
          ''

        const descText = $event.find('.event-description, .description, p').text()?.trim() || ''

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
                title: 'Dog People Event',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Dog People Co',
            registration_required: false,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Dog People event:', error)
      }
    })

    return events
  }
}
