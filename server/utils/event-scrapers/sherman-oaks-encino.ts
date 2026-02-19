// =============================================================================
// Sherman Oaks Encino Chamber Event Scraper
// https://members.shermanoaksencinochamber.org/events/calendar
// =============================================================================

import { EventScraper } from './base'

export class ShermanOaksEncinoScraper extends EventScraper {
  name = 'Sherman Oaks Encino Chamber'
  url = 'https://members.shermanoaksencinochamber.org/events/calendar'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Calendar view typically uses event cards or list items
    const eventElements = $(
      '.event-card, .event-item, .calendar-event, [data-event], .event, li[data-id]',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        const name = $event.find('.event-title, .title, h2, h3').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, [data-date]').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time').text()?.trim() || ''

        const locationText =
          $event.find('.event-location, .location, .venue').text()?.trim() || ''

        const descText = $event.find('.event-description, .description, p').text()?.trim() || ''

        const linkEl = $event.find('a[href*="event"], a').first()
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
            hosted_by: 'Sherman Oaks Encino Chamber',
            registration_required: true,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Sherman Oaks Encino event:', error)
      }
    })

    return events
  }
}
