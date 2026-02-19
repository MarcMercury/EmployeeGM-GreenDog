// =============================================================================
// Base Event Scraper Class
// =============================================================================

import * as cheerio from 'cheerio'

export type TextContent = string | null
export type HTMLContent = Buffer | string

export interface BaseScraper {
  name: string
  url: string
  scrape(): Promise<Array<{
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
  }>>
}

export class EventScraper implements BaseScraper {
  name: string = 'Base Event Scraper'
  url: string = ''

  async fetchHTML(url?: string): Promise<string> {
    const targetUrl = url || this.url
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.text()
    } catch (error) {
      console.error(`Failed to fetch ${targetUrl}:`, error)
      throw error
    }
  }

  protected cheerio(html: string) {
    return cheerio.load(html)
  }

  protected parseDate(dateStr: string): string {
    // Parse various date formats and return ISO string
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}`)
        return new Date().toISOString().split('T')[0]
      }
      return date.toISOString().split('T')[0]
    } catch {
      console.warn(`Date parse error: ${dateStr}`)
      return new Date().toISOString().split('T')[0]
    }
  }

  protected parseTime(timeStr?: string): string | undefined {
    if (!timeStr) return undefined
    // Normalize to HH:MM format
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s?(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = match[2]
      const period = match[3]?.toUpperCase()

      if (period === 'PM' && hours !== 12) {
        hours += 12
      } else if (period === 'AM' && hours === 12) {
        hours = 0
      }

      return `${String(hours).padStart(2, '0')}:${minutes}`
    }
    return undefined
  }

  protected sanitizeText(text: string | null | undefined): string {
    if (!text) return ''
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500)
  }

  async scrape(): Promise<any[]> {
    throw new Error('Scrape method must be implemented by subclass')
  }
}
