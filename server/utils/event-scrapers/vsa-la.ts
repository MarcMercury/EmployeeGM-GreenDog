// =============================================================================
// Venice Street Art Space Event Scraper
// https://www.vsa.la/events
// =============================================================================

import { EventScraper } from './base'

export class VeniceStreetArtScraper extends EventScraper {
  name = 'Venice Street Art'
  url = 'https://www.vsa.la/events'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Art spaces typically use event post listings
    const eventElements = $(
      '.event, .event-item, .event-post, [data-event], .listing, article, .post',
    )

    eventElements.each((index, element) => {
      try {
        const $event = $(element)

        const name = $event.find('.event-title, .title, h1, h2, h3').first().text()?.trim() || ''

        const dateText = $event.find('.event-date, .date, time').text()?.trim() || ''

        const timeText = $event.find('.event-time, .time').text()?.trim() || ''

        const locationText =
          $event.find('.event-location, .location, .venue').text()?.trim() ||
          'Venice Street Art Space' ||
          ''

        const descText =
          $event.find('.event-description, .description, .content, p').text()?.trim() || ''

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
                title: 'VSA Event',
                url: detailsUrl,
              },
            ],
            event_type: 'community_outreach',
            hosted_by: 'Venice Street Art',
            registration_required: false,
            source_url: this.url,
          })
        }
      } catch (error) {
        console.error('Error parsing Venice Street Art event:', error)
      }
    })

    return events
  }
}
