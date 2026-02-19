# API Reference - Event Scraping System

## Endpoints Overview

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/marketing/scrape-events` | Manual scraping trigger | User JWT |
| GET | `/api/marketing/pending-events` | Get pending events | User JWT |
| GET | `/api/cron/scrape-external-events` | Scheduled scraping | CRON_SECRET |

---

## 1. POST `/api/marketing/scrape-events`

**Manually trigger event scraping from external calendars**

### Authorization
- Requires: `Authorization: Bearer <USER_JWT_TOKEN>`
- Allowed roles: `admin`, `marketing_admin`, `partner`

### Request Body
```json
{
  "sources": ["Venice Chamber of Commerce", "Dog People Co"],
  "insert": true
}
```

**Parameters:**
- `sources` (optional, string[]): Specific calendars to scrape
  - If empty/omitted: scrapes ALL sources
  - Available sources:
    - "Main Street Santa Monica"
    - "Venice Chamber of Commerce"
    - "Santa Monica Chamber"
    - "Sherman Oaks Encino Chamber"
    - "Dog People Co"
    - "Venice Street Art"
    - "Venice Paparazzi"
    - "Venice Heritage Museum"
    - "Venice Fest"

- `insert` (optional, boolean): Whether to auto-insert events into calendar
  - Default: `true`
  - Set to `false` to only retrieve events without inserting

### Response (Success)
```json
{
  "success": true,
  "timestamp": "2026-02-19T10:30:00.000Z",
  "scraping": {
    "total_sources": 2,
    "successful": 2,
    "failed": 0,
    "total_events_found": 12,
    "sources": [
      {
        "name": "Venice Chamber of Commerce",
        "success": true,
        "events_found": 7,
        "error": null
      },
      {
        "name": "Dog People Co",
        "success": true,
        "events_found": 5,
        "error": null
      }
    ]
  },
  "insertion": {
    "total_events": 12,
    "created": 11,
    "skipped": 1,
    "failed": 0,
    "by_source": {
      "Venice Chamber of Commerce": {
        "success": true,
        "total": 7,
        "created": 7,
        "skipped": 0,
        "results": [
          {
            "id": "event-uuid-1",
            "name": "Venice Chamber Networking Event",
            "status": "created"
          }
        ]
      }
    }
  },
  "events": [
    {
      "name": "Venice Chamber Networking Event",
      "description": "Monthly networking mixer for local businesses",
      "event_date": "2026-03-15",
      "start_time": "18:00",
      "end_time": "20:00",
      "location": "Venice, California",
      "contact_email": "info@venicechamber.net",
      "contact_name": "Chamber Events",
      "contact_phone": null,
      "external_links": [
        {
          "title": "Chamber Event",
          "url": "https://business.venicechamber.net/events/details/123",
          "description": "Event details page"
        }
      ],
      "event_type": "community_outreach",
      "hosted_by": "Venice Chamber of Commerce",
      "registration_required": true,
      "registration_link": "https://business.venicechamber.net/events/details/123",
      "notes": null,
      "source_url": "https://business.venicechamber.net/events/"
    }
  ]
}
```

### Response (Error)
```json
{
  "statusCode": 403,
  "statusMessage": "Only marketing admins can trigger event scraping",
  "success": false
}
```

### Error Codes
| Code | Message | Cause |
|------|---------|-------|
| 401 | Unauthorized | No authentication token |
| 403 | Only marketing admins can trigger event scraping | Insufficient role |
| 500 | Failed to scrape events | Server error during scraping |

### Example Usage (cURL)
```bash
curl -X POST https://your-domain.com/api/marketing/scrape-events \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["Venice Chamber of Commerce"],
    "insert": true
  }'
```

### Example Usage (JavaScript/Fetch)
```typescript
const response = await fetch('/api/marketing/scrape-events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    sources: ['Venice Chamber of Commerce'],
    insert: true
  })
})

const data = await response.json()
console.log(`Created ${data.insertion.created} events`)
```

### Example Usage (useEventScraping Composable)
```typescript
const { triggerScraping } = useEventScraping()

// Scrape specific sources
const result = await triggerScraping({
  sources: ['Venice Chamber of Commerce', 'Dog People Co'],
  insert: true
})

// Scrape all sources
const result = await triggerScraping({ insert: true })

// Just retrieve without inserting
const result = await triggerScraping({
  sources: ['Venice Chamber of Commerce'],
  insert: false // Review first
})
```

---

## 2. GET `/api/marketing/pending-events`

**Retrieve events waiting for approval**

### Authorization
- Requires: `Authorization: Bearer <USER_JWT_TOKEN>`
- Allowed roles: `admin`, `marketing_admin`, `partner`

### Query Parameters
None

### Response (Success)
```json
{
  "success": true,
  "count": 3,
  "events": [
    {
      "id": "event-uuid-123",
      "name": "Community Workshop",
      "event_date": "2026-03-20",
      "location": "Venice, CA",
      "status": "pending",
      "is_auto_scraped": true,
      "source_name": "Venice Chamber of Commerce",
      "source_url": "https://business.venicechamber.net/events/"
    }
  ]
}
```

### Example Usage

```typescript
const response = await fetch('/api/marketing/pending-events', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
})

const { count, events } = await response.json()
console.log(`${count} events awaiting review`)
```

---

## 3. GET `/api/cron/scrape-external-events`

**Scheduled cron job for automatic scraping (Vercel)**

### Authorization
- Requires: `Authorization: Bearer <NUXT_CRON_SECRET>`
- **NO** user JWT required
- Environment variable: `NUXT_CRON_SECRET`

### Schedule
- Default: Daily at 6 AM UTC
- Configured via `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/scrape-external-events",
    "schedule": "0 6 * * *"
  }]
}
```

### Response (Success)
```json
{
  "success": true,
  "timestamp": "2026-02-19T06:00:00.000Z",
  "summary": {
    "total_events": 45,
    "created": 42,
    "skipped": 3,
    "failed": 0,
    "by_source": {
      "Venice Chamber of Commerce": {
        "success": true,
        "total": 7,
        "created": 7,
        "skipped": 0
      }
    }
  },
  "details": [
    {
      "source": "Venice Chamber of Commerce",
      "success": true,
      "events": [...],
      "lastRun": "2026-02-19T06:00:00.000Z"
    }
  ]
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "HTTP 403: Database connection failed",
  "timestamp": "2026-02-19T06:00:00.000Z"
}
```

---

## Common Patterns

### Get all events from all sources
```typescript
POST /api/marketing/scrape-events
{
  "insert": true
}
```

### Preview events before importing
```typescript
POST /api/marketing/scrape-events
{
  "sources": ["Venice Chamber of Commerce"],
  "insert": false
}
// Then review response.events array
```

### Scrape specific source
```typescript
POST /api/marketing/scrape-events
{
  "sources": ["Dog People Co"]
}
```

### Import and track results
```typescript
const response = await fetch('/api/marketing/scrape-events', {
  method: 'POST',
  body: JSON.stringify({
    sources: ['Venice Chamber of Commerce'],
    insert: true
  })
})

const { insertion } = await response.json()
console.log(`✓ Created: ${insertion.created}`)
console.log(`⊘ Skipped: ${insertion.skipped}`)
console.log(`✗ Failed: ${insertion.failed}`)
```

---

## Rate Limiting & Best Practices

### Rate Limits
- No explicit rate limits per endpoint
- Scraping all sources takes ~30-60 seconds
- Recommend max 1 manual scrape per 5 minutes

### Best Practices
1. **Use scheduled cron** for daily/weekly imports
2. **Manual scraping** for immediate needs only
3. **Preview first** by setting `insert: false`
4. **Monitor logs** in Vercel dashboard
5. **Handle failures gracefully** in UI

### Error Handling
```typescript
try {
  const result = await triggerScraping({
    sources: ['Venice Chamber of Commerce'],
    insert: true
  })
  
  if (result.success) {
    console.log('✓ Scraping complete')
    console.log(`Created: ${result.data.insertion.created}`)
  } else {
    console.error('✗ Scraping failed:', result.error)
  }
} catch (error) {
  console.error('Network error:', error)
}
```

---

## Testing the APIs

### Test with cURL
```bash
# Test scraping endpoint
curl -X POST http://localhost:3000/api/marketing/scrape-events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"insert": false}'

# Test pending events
curl http://localhost:3000/api/marketing/pending-events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Cron with Vercel
```bash
# Local testing (requires NUXT_CRON_SECRET set)
curl http://localhost:3000/api/cron/scrape-external-events \
  -H "Authorization: Bearer $NUXT_CRON_SECRET"
```

---

## Troubleshooting API Issues

### "Unauthorized" Error
- Check JWT token is valid
- Verify role includes `admin`, `marketing_admin`, or `partner`
- Check token hasn't expired

### "Failed to scrape events" Error  
- Check network connectivity to external sites
- Verify site HTML structure hasn't changed
- Check function logs in Vercel

### Events not inserting
- Verify duplicate check (same name + date)
- Check Supabase connection
- Review database migration ran

### Cron not running
- Verify `NUXT_CRON_SECRET` is set in Vercel
- Check `vercel.json` has cron configured
- Review Vercel Function logs
- Ensure endpoint is accessible publicly
