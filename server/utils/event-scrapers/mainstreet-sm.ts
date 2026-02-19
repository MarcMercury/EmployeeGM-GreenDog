// =============================================================================
// Main Street Santa Monica Event Scraper
// https://www.mainstreetsm.com/calendar/
// =============================================================================

import { EventScraper } from './base'

export class MainStreetSMScraper extends EventScraper {
  name = 'Main Street Santa Monica'
  url = 'https://www.mainstreetsm.com/calendar/'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Target calendar event containers
    // Main Street SM likely uses a calendar plugin with event listings
    const eventSelectors = [
      '.event-item',
      '.calendar-event',
      '[data-event]',
      '.tribe-events-list-event',
      '.event',
    ]

    for (const selector of eventSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        elements.each((index, element) => {
          try {
            const $event = $(element)

            // Extract event details from various possible selectors
            const name = $event.find('.event-title, .title, h3').text()?.trim() || ''
            const dateText = $event
              .find('.event-date, .date, [data-date]')
              .text()
              ?.trim() || ''
            const locationText = $event
              .find('.event-location, .location, .venue')
              .text()
              ?.trim() || ''
            const descText = $event
              .find('.event-description, .description, p')
              .text()
              ?.trim() || ''
            const linkEl = $event.find('a[href*="event"]').first()
            const detailsUrl = linkEl.attr('href') || this.url

            if (name && dateText) {
              events.push({
                name,
                description: this.sanitizeText(descText),
                event_date: this.parseDate(dateText),
                location: this.sanitizeText(locationText),
                external_links: [
                  {
                    title: 'Event Details',
                    url: detailsUrl || this.url,
                  },
                ],
                event_type: 'community_outreach',
                hosted_by: 'Main Street Santa Monica',
                registration_required: true,
                source_url: this.url,
              })
            }
          } catch (error) {
            console.error('Error parsing event element:', error)
          }
        })

        if (events.length > 0) {
          return events
        }
      }
    }

    // Fallback: Try calendar link parsing
    const calendarLinks = $('a[href*="event"]')
    if (calendarLinks.length > 0) {
      calendarLinks.each((index, el) => {
        const $link = $(el)
        const text = $link.text().trim()
        const href = $link.attr('href') || ''

        if (text && (href.includes('event') || text.match(/\d{1,2}\/\d{1,2}/))) {
          events.push({
            name: text,
            description: 'Community event on Main Street Santa Monica',
            event_date: new Date().toISOString().split('T')[0],
            external_links: [
              {
                title: 'Event Details',
                url: new URL(href, this.url).toString(),
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Main Street Santa Monica',
            registration_required: true,
            source_url: this.url,
          })
        }
      })
    }

    return events
  }
}
