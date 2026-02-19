// =============================================================================
// Venice Chamber of Commerce Event Scraper
// https://business.venicechamber.net/events/
// =============================================================================

import { EventScraper } from './base'

export class VeniceChamberScraper extends EventScraper {
  name = 'Venice Chamber of Commerce'
  url = 'https://business.venicechamber.net/events/'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Chamber directories often use Gravtiy Forms or similar event plugins
    const eventElements = $(
      '.event-item, .event-listing, [data-event], .tribe-event, .chamber-event, [data-id]',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        // Try multiple selector combinations for event data
        const name =
          $event.find('.event-name, .event-title, h2, h3').first().text()?.trim() ||
          $event.attr('data-title') ||
          ''

        const dateText =
          $event.find('.event-date, .date, [data-date]').text()?.trim() ||
          $event.attr('data-date') ||
          ''

        const timeText = $event
          .find('.event-time, .time, [data-time]')
          .text()
          ?.trim() ||
          ''

        const locationText = $event.find('.event-location, .location, .venue').text()?.trim() || ''

        const descText = $event.find('.event-description, .description, p').text()?.trim() || ''

        const linkEl = $event.find('a').first()
        const detailsUrl = linkEl.attr('href')
          ? new URL(linkEl.attr('href')!, this.url).toString()
          : this.url

        const emailText = $event.find('[data-email], .email').text()?.trim() || ''

        if (name && dateText) {
          events.push({
            name,
            description: this.sanitizeText(descText),
            event_date: this.parseDate(dateText),
            start_time: this.parseTime(timeText),
            location: this.sanitizeText(locationText),
            contact_email: emailText.includes('@') ? emailText : undefined,
            external_links: [
              {
                title: 'Chamber Event',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Venice Chamber of Commerce',
            registration_required: true,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing event:', error)
      }
    })

    return events
  }
}
