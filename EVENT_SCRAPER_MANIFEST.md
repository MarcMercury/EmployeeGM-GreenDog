# Event Scraper System - File Manifest

## Core System Files (11 files)

### Event Scrapers (`server/utils/event-scrapers/`)
```
server/utils/event-scrapers/
├── index.ts                          # Main aggregator & interfaces
├── base.ts                           # Base EventScraper class
├── mainstreet-sm.ts                  # Main Street Santa Monica scraper
├── venice-chamber.ts                 # Venice Chamber of Commerce scraper
├── santa-monica-chamber.ts           # Santa Monica Chamber scraper
├── sherman-oaks-encino.ts            # Sherman Oaks Encino Chamber scraper
├── dog-people.ts                     # Dog People Co scraper
├── vsa-la.ts                         # Venice Street Art scraper
├── venice-paparazzi.ts               # Venice Paparazzi scraper
├── venice-heritage-museum.ts         # Venice Heritage Museum scraper
└── venice-fest.ts                    # Venice Fest scraper
```

### Services & Utilities (1 file)
```
server/utils/
└── event-insertion.service.ts        # Database insertion logic
```

### API Endpoints (3 files)
```
server/api/
├── cron/
│   └── scrape-external-events.get.ts # Scheduled scraping endpoint
└── marketing/
    ├── scrape-events.post.ts         # Manual scraping endpoint
    └── pending-events.get.ts         # Pending events query endpoint
```

### Frontend Components (2 files)
```
app/
├── composables/
│   └── useEventScraping.ts           # Vue 3 composable
└── components/marketing/
    └── EventScraperDialog.vue        # Import UI dialog component
```

### Database (1 file)
```
supabase/migrations/
└── 20260219_scraped_events_tracking.sql  # Database schema changes
```

## Documentation Files (4 files)

```
docs/
├── EVENT_SCRAPER_SETUP.md            # Comprehensive setup guide
└── EVENT_SCRAPER_API.md              # API reference documentation

scripts/
└── install-event-scraper.sh          # Installation helper script

Root/
└── EVENT_SCRAPER_IMPLEMENTATION.md   # Implementation summary
```

## Modified Files (1 file)

```
package.json                          # Added cheerio dependency
```

## Total: 23 Files Created/Modified

---

## File Descriptions

### Event Scraper Classes

**base.ts**
- Abstract base class for all scrapers
- Provides common utilities:
  - HTML fetching
  - Date/time parsing
  - Text sanitization
  - Cheerio integration

**mainstreet-sm.ts** 
- Targets: Main Street Santa Monica events
- Handles: Generic calendar plugin structures
- Fallback: Link-based parsing

**venice-chamber.ts**
- Targets: Venice Chamber business events
- Handles: Member portal event listings
- Contact extraction: Email parsing

**santa-monica-chamber.ts**
- Targets: Santa Monica Chamber events
- Handles: Table and card-based layouts
- Features: Time and location parsing

**sherman-oaks-encino.ts**
- Targets: Sherman Oaks Encino Chamber
- Handles: Calendar view events
- Features: Full event metadata extraction

**dog-people.ts**
- Targets: Dog People Co community events
- Handles: Post and gallery listings
- Features: Community event markup

**vsa-la.ts**
- Targets: Venice Street Art events
- Handles: Art space event posts
- Features: Exhibition and event info

**venice-paparazzi.ts**
- Targets: Venice Paparazzi event coverage
- Handles: Post and article layouts
- Features: Event from article extraction

**venice-heritage-museum.ts**
- Targets: Museum event listings
- Handles: Upcoming events pages
- Features: Museum-specific metadata

**venice-fest.ts**
- Targets: Venice Fest schedule
- Handles: Festival event cards
- Features: Multiple event types

### Services

**event-insertion.service.ts**
- Normalizes scraped events to DB schema
- Duplicate prevention logic
- Batch insertion handling
- Transaction management
- Result tracking and reporting

### API Endpoints

**scrape-external-events.get.ts** (Cron)
- Entry point for scheduled scraping
- Triggers all scrapers
- Handles insertion
- Logs results
- Protected by CRON_SECRET

**scrape-events.post.ts** (Manual)
- User-triggered scraping
- Source selection
- Optional insertion
- Permission checking
- Detailed response

**pending-events.get.ts**
- Queries pending events
- Permission-based filtering
- Returns ready-to-review events

### Frontend

**useEventScraping.ts**
- Composable for scraping operations
- State management for results
- Error handling
- Source enumeration
- API integration

**EventScraperDialog.vue**
- Modal UI component
- Source selection
- Import options
- Results display
- Progress indication

### Database

**20260219_scraped_events_tracking.sql**
- Adds `is_auto_scraped` column
- Adds `source_url` column
- Adds `source_name` column
- Adds `external_links` JSONB column
- Creates performance indexes

### Scripts

**install-event-scraper.sh**
- Automated setup script
- Dependency installation
- Environment variable generation
- Configuration guidance

### Documentation

**EVENT_SCRAPER_SETUP.md**
- Complete setup instructions
- Permission requirements
- API usage examples
- Source details
- Troubleshooting guide

**EVENT_SCRAPER_API.md**
- API endpoint reference
- Request/response examples
- Error handling
- Testing instructions
- Best practices

**EVENT_SCRAPER_IMPLEMENTATION.md**
- System overview
- Feature list
- Quick start guide
- File inventory
- Troubleshooting

---

## Key Features by File

| Feature | File | Type |
|---------|------|------|
| HTML Parsing | base.ts, [source].ts | Logic |
| Duplicate Prevention | event-insertion.service.ts | Logic |
| Daily Scheduling | scrape-external-events.get.ts | Endpoint |
| Manual Triggering | scrape-events.post.ts | Endpoint |
| User Interface | EventScraperDialog.vue | Component |
| State Management | useEventScraping.ts | Composable |
| Database Schema | 20260219_*.sql | Migration |
| Documentation | docs/* | Docs |

---

## Dependencies Added

- `cheerio` (^1.0.0-rc.12) - HTML parsing library

---

## Architecture Flow

```
┌─────────────────────────────────────┐
│     External Event Websites         │
└──────────────────┬──────────────────┘
                   │
                   ↓
┌─────────────────────────────────────┐
│  Event Scraper Classes (9 sources)  │
│  - base.ts (utilities)              │
│  - [source].ts files (1 each)       │
└──────────────────┬──────────────────┘
                   │
                   ↓
┌─────────────────────────────────────┐
│  EventScraperAggregator             │
│  - index.ts (coordination)          │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
   ┌────────────────┐  ┌──────────────────┐
   │ Manual API     │  │ Cron Job         │
   │ scrape-events  │  │ scrape-external  │
   │ .post.ts       │  │ -events.get.ts   │
   └────────┬───────┘  └────────┬─────────┘
            │                   │
            └────────┬──────────┘
                     ↓
         ┌──────────────────────┐
         │ EventInsertionService│
         │ (deduplication)      │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │  Supabase Database   │
         │ marketing_events tbl │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │  Marketing Calendar  │
         │  UI (Vue Component)  │
         └──────────────────────┘
```

---

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Migration applied (`npm run db:migrate`)
- [ ] Environment variables configured
- [ ] Manual scraping tested via API
- [ ] UI component renders
- [ ] Events appear in calendar
- [ ] Cron job configured in Vercel
- [ ] Scheduled run verified
- [ ] Duplicate prevention working

---

## Deployment Checklist

- [ ] All files committed to git
- [ ] package.json reflects cheerio dependency
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] Vercel cron configured
- [ ] UI component integrated in calendar page
- [ ] API endpoints accessible
- [ ] Permissions configured
- [ ] Logs monitored in Vercel
- [ ] Initial manual scrape successful

---

## Future Enhancements

- [ ] Event filtering/curation UI
- [ ] Custom scraper configurations per source
- [ ] Event deduplication by location+time
- [ ] Calendar feed subscriptions
- [ ] AI-based event categorization
- [ ] Multi-language support
- [ ] Webhook notifications
- [ ] Event change detection
- [ ] Import scheduling UI
- [ ] Source health monitoring
