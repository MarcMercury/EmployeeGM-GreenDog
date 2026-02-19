# 🎉 External Event Calendar Scraper

Automatically pulls events from partner websites and community calendars and inserts them into your Marketing Calendar.

## 📋 Overview

This system includes:
- **9 Event Scrapers** - Each targeting a specific calendar source
- **Automatic Cron Job** - Runs daily to keep events updated
- **Manual API Endpoint** - Trigger scraping on-demand
- **Vue Component** - User interface for managing imports
- **Duplicate Prevention** - Prevents duplicate event creation
- **Source Tracking** - Records where each event came from

## 🔧 Setup & Installation

### 1. Install Dependencies

Add cheerio for HTML parsing:

```bash
npm install cheerio
npm install -D @types/cheerio
```

### 2. Configure Environment Variables

Add to your `.env`:

```env
# Cron job secret for scheduled scraping
NUXT_CRON_SECRET=your-secret-key-here
```

Configure Vercel Crons in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/scrape-external-events",
    "schedule": "0 6 * * *"
  }]
}
```

### 3. Database Migration

Run the migration to add scraping-related columns:

```bash
npm run db:migrate
```

This adds:
- `is_auto_scraped` - Boolean flag for auto-scraped events
- `source_url` - URL where event was scraped
- `source_name` - Name of the source site
- `external_links` - Array of related links

### 4. Update Marketing Calendar Page

Add the scraper component to `app/pages/marketing/calendar.vue`:

```vue
<template>
  <div>
    <!-- Existing calendar code -->
    
    <!-- Add scraper button in header -->
    <EventScraperDialog @events-imported="refreshCalendar" />
  </div>
</template>

<script setup lang="ts">
import EventScraperDialog from '~/components/marketing/EventScraperDialog.vue'
</script>
```

## 📡 Event Sources

The system scrapes from these calendars:

1. **Main Street Santa Monica** - `https://www.mainstreetsm.com/calendar/`
2. **Venice Chamber of Commerce** - `https://business.venicechamber.net/events/`
3. **Santa Monica Chamber** - `https://members.smchamber.com/events`
4. **Sherman Oaks Encino Chamber** - `https://members.shermanoaksencinochamber.org/events/calendar`
5. **Dog People Co** - `https://www.dogppl.co/calendar`
6. **Venice Street Art** - `https://www.vsa.la/events`
7. **Venice Paparazzi** - `https://www.venicepaparazzi.com/recent-events-covered/sunsoutvenice/`
8. **Venice Heritage Museum** - `https://www.veniceheritagemuseum.org/upcoming-events.html`
9. **Venice Fest** - `https://www.thevenicefest.com/`

### Adding New Sources

To add a new scraper:

1. Create a new class in `server/utils/event-scrapers/your-source.ts`:

```typescript
import { EventScraper } from './base'

export class YourSourceScraper extends EventScraper {
  name = 'Your Source Name'
  url = 'https://your-calendar-url.com'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []

    // Parse HTML and extract events
    // Each event should match the ScrapedEvent interface

    return events
  }
}
```

2. Import in `server/utils/event-scrapers/index.ts`:

```typescript
import { YourSourceScraper } from './your-source'

// Add to scrapers array:
const scrapers = [
  // ... existing scrapers
  new YourSourceScraper(),
]
```

## 🚀 Usage

### Automatic Scraping (Scheduled)

The cron job runs daily at 6 AM UTC and automatically:
1. Scrapes all configured sources
2. Deduplicates events
3. Inserts into marketing_events table
4. Logs all activity

### Manual Scraping (On-Demand)

#### Via UI

1. Go to Marketing Calendar page
2. Click "Import Events" button
3. Select event sources
4. Choose to auto-insert or review first
5. Click "Start Import"

#### Via API

```bash
# Scrape all sources and insert automatically
curl -X POST http://localhost:3000/api/marketing/scrape-events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [],
    "insert": true
  }'

# Scrape specific sources without inserting
curl -X POST http://localhost:3000/api/marketing/scrape-events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["Venice Chamber of Commerce", "Dog People Co"],
    "insert": false
  }'
```

### Fetch Pending Events

Review events before insertion:

```bash
curl -X GET http://localhost:3000/api/marketing/pending-events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Response Examples

### POST /api/marketing/scrape-events

**Success Response:**

```json
{
  "success": true,
  "timestamp": "2026-02-19T06:00:00.000Z",
  "scraping": {
    "total_sources": 9,
    "successful": 8,
    "failed": 1,
    "total_events_found": 42,
    "sources": [
      {
        "name": "Venice Chamber of Commerce",
        "success": true,
        "events_found": 5
      }
    ]
  },
  "insertion": {
    "total_events": 42,
    "created": 38,
    "skipped": 3,
    "failed": 1,
    "by_source": {
      "Venice Chamber of Commerce": {
        "success": true,
        "total": 5,
        "created": 5,
        "skipped": 0
      }
    }
  },
  "events": [
    {
      "name": "Community Workshop",
      "event_date": "2026-03-15",
      "location": "Venice, CA",
      "hosted_by": "Venice Chamber of Commerce",
      "source_url": "https://business.venicechamber.net/events/"
    }
  ]
}
```

## 🔍 Event Data Mapping

Scraped events are mapped to the `marketing_events` table:

| Scraped Field | DB Column | Type | Notes |
|---|---|---|---|
| name | name | TEXT | Event title |
| description | description | TEXT | Event description |
| event_date | event_date | DATE | Normalized date |
| start_time | start_time | TIME | Optional start time |
| end_time | end_time | TIME | Optional end time |
| location | location | TEXT | Event location |
| contact_name | contact_name | TEXT | Event contact person |
| contact_email | contact_email | TEXT | Contact email |
| contact_phone | contact_phone | TEXT | Contact phone |
| hosted_by | hosted_by | TEXT | Organization hosting |
| event_type | event_type | TEXT | Event category |
| registration_link | registration_link | TEXT | Registration URL |
| registration_required | registration_required | BOOLEAN | Whether registration needed |
| external_links | external_links | JSONB | Array of related links |
| source_url | source_url | TEXT | URL scraped from |
| source_name | source_name | TEXT | Source site name |
| is_auto_scraped | is_auto_scraped | BOOLEAN | Auto-scraped flag |

## 🛡️ Duplicate Prevention

The system prevents duplicates by:

1. Checking for existing events with the same name and date
2. Skipping if found (logged in results)
3. Never overwriting existing events

## 📝 Permissions

Only marketing admins can:
- Trigger manual scraping
- View/manage scraped events
- Configure sources

Required roles: `admin`, `marketing_admin`, or `partner`

## 🐛 Troubleshooting

### Events not scraping from a source

1. Check if website structure has changed
2. Review scraper selectors for that source
3. Check browser console for fetch errors
4. Verify network access to external site

### Cron job not running

1. Verify Vercel project has cron enabled
2. Check `NUXT_CRON_SECRET` environment variable
3. Review Vercel Function logs
4. Ensure migration ran successfully

### Duplicate events appearing

1. Clear and re-apply migration
2. Check for events with same name/date
3. Review deletion policies

## 📚 Files Created

- `server/utils/event-scrapers/` - All scraper implementations
- `server/utils/event-insertion.service.ts` - Database insertion logic
- `server/api/cron/scrape-external-events.get.ts` - Scheduled cron job
- `server/api/marketing/scrape-events.post.ts` - Manual scraping API
- `server/api/marketing/pending-events.get.ts` - Get pending events
- `app/composables/useEventScraping.ts` - Vue composable
- `app/components/marketing/EventScraperDialog.vue` - Import UI
- `supabase/migrations/20260219_scraped_events_tracking.sql` - DB migration

## 🔄 Workflow

```
External Website
       ↓
   [Scraper] ← Fetch & Parse HTML
       ↓
  ScrapedEvent
       ↓
 [Deduplication Check]
       ↓
   [Insert Service] ← Normalize event
       ↓
  marketing_events Table
       ↓
   Display in Calendar
```

## 🎯 Next Steps

1. Install cheerio dependency
2. Run database migration
3. Set environment variables
4. Configure Vercel cron job
5. Add component to calendar page
6. Test manual scraping via UI
7. Monitor first automated run
