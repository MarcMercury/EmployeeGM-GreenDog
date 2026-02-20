# 📅 Event Scraper System - Implementation Summary

**Created:** February 19, 2026  
**Status:** ✅ Complete and Ready to Deploy

## 🎯 System Overview

A complete automated event scraping system that pulls events from 9 partner website calendars and automatically inserts them into your Marketing Calendar.

## 📦 What Was Created

### Core System Components

#### 1. **Event Scrapers** (`server/utils/event-scrapers/`)
- `base.ts` - Base EventScraper class with common utilities
- `index.ts` - Main aggregator coordinating all scrapers
- `mainstreet-sm.ts` - Main Street Santa Monica
- `venice-chamber.ts` - Venice Chamber of Commerce
- `santa-monica-chamber.ts` - Santa Monica Chamber
- `sherman-oaks-encino.ts` - Sherman Oaks Encino Chamber
- `dog-people.ts` - Dog People Co
- `vsa-la.ts` - Venice Street Art
- `venice-paparazzi.ts` - Venice Paparazzi
- `venice-heritage-museum.ts` - Venice Heritage Museum
- `venice-fest.ts` - Venice Fest

#### 2. **Database Layer** (`server/utils/`)
- `event-insertion.service.ts` - Handles event insertion and deduplication
  - Normalizes scraped events
  - Checks for duplicates
  - Batch imports events
  - Tracks insertion results

#### 3. **API Endpoints** (`server/api/`)
- `cron/scrape-external-events.get.ts` - Scheduled daily scraping
- `marketing/scrape-events.post.ts` - Manual scraping trigger
- `marketing/pending-events.get.ts` - Query pending events

#### 4. **Frontend** (`app/`)
- `composables/useEventScraping.ts` - Vue composable for scraping
- `components/marketing/EventScraperDialog.vue` - Import UI component

#### 5. **Database** (`supabase/migrations/`)
- `20260219_scraped_events_tracking.sql` - Migration adding tracking columns
  - `is_auto_scraped` - Flag for auto-scraped events
  - `source_url` - Source website URL
  - `source_name` - Source organization name
  - `external_links` - Related links array

#### 6. **Documentation**
- `docs/EVENT_SCRAPER_SETUP.md` - Comprehensive setup guide
- `scripts/install-event-scraper.sh` - Installation helper script

#### 7. **Dependencies**
- Added `cheerio` (^1.0.0-rc.12) for HTML parsing

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Add to `.env`:
```env
NUXT_CRON_SECRET=your-unique-secret-key-here
```

### Step 3: Run Database Migration
```bash
npm run db:migrate
```

### Step 4: Configure Scheduled Jobs (Vercel)
Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-external-events",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This runs scraping daily at 6 AM UTC.

### Step 5: Add UI Component
In `app/pages/marketing/calendar.vue`, add to header:
```vue
<EventScraperDialog @events-imported="refreshCalendar" />

<script setup>
import EventScraperDialog from '~/components/marketing/EventScraperDialog.vue'

const refreshCalendar = () => {
  // Refresh calendar data after import
  // Trigger your existing calendar refresh logic
}
</script>
```

### Step 6: Deploy
```bash
npm run build
git add .
git commit -m "Add external event calendar scraping system"
git push
```

## 📊 Event Data Flow

```
External Websites
      ↓
[EventScraper Classes]
      ↓
ScrapedEvent Interface
      ↓
EventInsertionService
      ↓
Duplicate Check
      ↓
marketing_events Table (Supabase)
      ↓
Display in Marketing Calendar UI
```

## 🔄 Usage Modes

### Automatic Daily Scraping
- Runs at 6 AM UTC daily via Vercel Cron
- No user action required
- Results logged in Vercel Function logs

### Manual On-Demand Scraping
1. Go to Marketing Calendar page
2. Click "Import Events"
3. Select event sources
4. Choose auto-insert or review first
5. Click "Start Import"

### API-Based Scraping
**Trigger scraping via API:**
```bash
curl -X POST https://your-domain.com/api/marketing/scrape-events \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["Venice Chamber of Commerce"],
    "insert": true
  }'
```

**Response includes:**
- Number of events found
- Number of events created
- Number of duplicates skipped
- Detailed breakdown by source

## 🎪 Event Sources

| Source | URL | Type |
|--------|-----|------|
| Main Street SM | mainstreetsm.com/calendar/ | Community |
| Venice Chamber | business.venicechamber.net/events/ | Chamber |
| Santa Monica Chamber | members.smchamber.com/events | Chamber |
| Sherman Oaks Encino | members.shermanoaksencinochamber.org/events/calendar | Chamber |
| Dog People Co | dogppl.co/calendar | Community Space |
| Venice Street Art | vsa.la/events | Art Organization |
| Venice Paparazzi | venicepaparazzi.com/recent-events-covered/ | News/Coverage |
| Venice Heritage Museum | veniceheritagemuseum.org/upcoming-events.html | Museum |
| Venice Fest | thevenicefest.com | Festival |

## 🛡️ Security & Permissions

- Only users with `admin`, `marketing_admin`, or `partner` roles can:
  - Trigger manual scraping
  - View pending events
  - Access scraping API
  
- Authentication via Supabase JWT tokens
- Cron jobs protected by `NUXT_CRON_SECRET`

## 🔍 Duplicate Prevention

The system prevents duplicate events by:
1. Checking for existing events with same name + date
2. Skipping if found (no overwrite)
3. Logging skips in insertion results

## 📝 Event Mapping

| Scraped Field | DB Column |
|---------------|-----------|
| name | name |
| description | description |
| event_date | event_date |
| start_time | start_time |
| end_time | end_time |
| location | location |
| contact_name | contact_name |
| contact_email | contact_email |
| contact_phone | contact_phone |
| hosted_by | hosted_by |
| event_type | event_type |
| registration_link | registration_link |
| registration_required | registration_required |
| external_links | external_links (JSONB) |
| source_url | source_url |

## 🐛 Troubleshooting

### Events not scraping from a source
1. Website structure may have changed
2. HTML selectors need updating in specific scraper
3. Network access blocked to that domain

**Solution:** Update the scraper's selector logic in the specific scraper file.

### Cron job not running
1. Verify Vercel environment variable is set
2. Check Vercel Function Logs dashboard
3. Ensure migration completed successfully

### Duplicate events appearing
1. Clear marketing_events entries from test
2. Verify duplicate check logic is working
3. Check database constraints

## 🔧 Extending the System

### Add a New Event Source

1. Create new scraper file: `server/utils/event-scrapers/new-site.ts`

```typescript
import { EventScraper } from './base'

export class NewSiteScraper extends EventScraper {
  name = 'New Site Name'
  url = 'https://new-site.com/events'

  async scrape() {
    const html = await this.fetchHTML()
    const $ = this.cheerio(html)
    const events = []
    
    // Parse HTML elements and build events array
    // Each event must match ScrapedEvent interface
    
    return events
  }
}
```

2. Register in `server/utils/event-scrapers/index.ts`:

```typescript
import { NewSiteScraper } from './new-site'

// Add to scrapers array
this.scrapers.push(new NewSiteScraper())
```

3. Update documentation in this file

## 📞 Support

For issues or questions:
1. Check logs in Vercel Function dashboard
2. Review EVENT_SCRAPER_SETUP.md documentation
3. Test manual scraping via UI first
4. Check Supabase logs for DB errors

## ✨ Key Features

✅ **Automatic Scheduling** - Daily runs via Vercel Cron  
✅ **Manual Control** - Trigger anytime from UI  
✅ **Duplicate Prevention** - Smart name+date checking  
✅ **Source Tracking** - Know where each event came from  
✅ **Flexible Parsing** - Works with various website structures  
✅ **Error Handling** - Graceful fallbacks and detailed logging  
✅ **Admin UI** - Easy import dialog for marketing team  
✅ **Role-Based Access** - Only authorized admins can import  

## 📈 Next Phase Ideas

- Event filtering/curation before insert
- Custom event type mapping per source
- Event deduplication by location+time
- Calendar subscription/feed integration
- Automatic event categorization with AI
- Multi-language event parsing
- Event change notifications

---

**Ready to deploy!** 🚀
