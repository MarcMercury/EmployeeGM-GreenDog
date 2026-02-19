# Marketing Events Scout Agent - Setup & Usage Guide

## System Overview

The Marketing Events Scout Agent is an AI-powered bot that:
1. **Discovers** local pet/animal/community events via web research
2. **Pre-fills** event details (date, time, location, contact info, etc.)
3. **Creates proposals** in the agent system for review
4. **Auto-approves** high-confidence events
5. **Adds to calendar** as "proposed" events ready for confirmation

## Architecture Components

### 1. Agent Handler
**File:** `server/agents/handlers/market-events-scout.ts`
- Searches for events using OpenAI
- Filters for relevance to pet/animal marketing
- Creates proposals with confidence scores
- Auto-approves high-confidence events (>80% by default)

### 2. Web Scraping Utilities
**File:** `server/utils/agents/event-scraping.ts`
- Generates search queries for specified location
- Filters events by keyword relevance
- Deduplicates similar events
- Checks for existing events in calendar
- Parses and normalizes date/time

### 3. Proposal Application
**File:** `server/utils/agents/appliers.ts` (event_discovery handler)
- Converts approved proposals to marketing events
- Sets event status to "proposed" for human review
- Includes confidence score and source info in notes

### 4. Agent Registry
**File:** `supabase/migrations/20260219000003_register_market_events_scout_agent.sql`
- Registers agent with default configuration
- Schedule: Every Sunday at 6 AM
- Daily token budget: 10,000 tokens
- Default location: Los Angeles, California

## Configuration

The agent is configured with these default search parameters:

**Location:** Los Angeles, California (customizable)
**Keywords Searched:**
- Pet festivals
- Holiday walks
- Street fairs
- Animal events
- Pet parades
- Vet conferences
- Pet adoption events
- Community fairs
- Farmers markets
- Holiday markets
- Carnivals
- Festivals

**Event Types:**
- street_fair
- pet_expo
- community_outreach
- fundraiser

**Confidence Threshold for Auto-Approval:** 80%
**Max Proposals per Run:** 20
**Proposal Expiration:** 30 days

## How It Works

### Step 1: Agent Run (Once per week)
```
Sunday 6 AM → Market Events Scout Agent Triggers
```

### Step 2: Event Discovery
1. Generate search queries for the configured location
2. Use AI to find relevant events
3. Filter events by keyword relevance (30% match minimum)
4. Remove duplicates
5. Check against existing calendar events

### Step 3: Proposal Creation
For each unique event found:
- Extract event details (name, date, time, location, contact, etc.)
- Calculate confidence score
- Create agent proposal with event details
- Auto-approve if confidence > 80%
- Keep for manual review if confidence < 80%

### Step 4: Proposal Review (Admin)
1. Navigate to Admin → Agents → Proposals tab
2. Filter by "event_discovery" proposal type
3. Review pending proposals
4. Approve/reject based on relevance
5. Approved proposals are automatically added to calendar

### Step 5: Event Calendar
Approved events appear in:
- **Status:** "proposed"
- **Staffing Status:** "planned"
- **Details:** Pre-filled from discovery
- **Notes:** Include source URL, confidence score, discovery date

## Customization

### Change Search Location
1. Admin → Agents → Agent Roster
2. Find "Marketing Events Scout"
3. Click configure/edit
4. Update "location" in config
5. Save

### Adjust Keywords
Edit the agent config to search for different keywords:
```
Added to config.keywords: "farmer market", "dog show", etc.
```

### Change Schedule
Modify the cron schedule in Agent Registry:
- Current: `0 6 * * 0` (Sunday 6 AM)
- For daily runs: `0 6 * * *`
- For twice-daily: `0 6,14 * * *`

### Tune Confidence Threshold
Lower threshold = more events found but lower quality
Higher threshold = only high-confidence events
- Current: 0.8 (80%)
- Recommend: 0.7-0.9 range

## Monitoring & Analytics

### Proposal Dashboard
- View all discovered events
- Track approval rate
- Monitor confidence scores
- See cost per discovery run

### Agent Run History
- Check token usage
- Monitor success/error rates
- View proposals created per run

### Metrics Tracked
- Events discovered
- Proposals created
- Auto-approved count
- Token cost (usually $0.10-$0.30 per run)
- Search coverage (queries attempted)

## Data Flow

```
Market Events Scout Agent
    ↓
Search Events (OpenAI)
    ↓
Filter & Deduplicate
    ↓
Create Proposals (pending/auto_approved)
    ↓
Admin Reviews (if pending)
    ↓
Apply Proposal
    ↓
Insert into marketing_events (status: proposed)
    ↓
Marketing Events Calendar
```

## Event Detail Mapping

Discovery data → Marketing Event fields:

| Discovery Field | Marketing Event Field |
|---|---|
| event_name | name |
| event_type | event_type |
| event_date | event_date |
| start_time | start_time |
| end_time | end_time |
| location | location |
| hosted_by | hosted_by |
| contact_* | contact_* fields |
| description | description |
| expected_attendance | expected_attendance |
| event_cost | event_cost |
| expectations | expectations |
| physical_setup | physical_setup |
| source_url | external_links |
| source_name + confidence | notes |

## Troubleshooting

### Agent Not Running
- Check: Is agent status "active"? (should be "active" not "paused")
- Check: Is current time past next scheduled run?
- Check: Are there token budget issues?

### No Events Found
- Increase search radius in config
- Expand keyword list
- Check location spelling
- Lower confidence threshold temporarily

### Low Quality Events
- Increase confidence threshold
- Refine keywords
- Review and reject poor proposals
- Adjust event type filters

### Events Not Appearing in Calendar
- Check proposal status (approved/auto_approved)
- Verify apply_proposal worked (no DB errors)
- Check marketing_events table for status = "proposed"

## Future Enhancements

Potential additions:
- Real web scraping with Playwright/Puppeteer
- EventBrite API integration
- Facebook Events scraping
- Real-time updates (not just weekly)
- Geographic clustering for multi-location
- ROI tracking per discovered event
- Automatic lead capture from event attendance
- Email notifications when events are discovered
- Integration with scheduling system

## Files Modified/Created

Created:
- ✓ Migration: 20260219000003_register_market_events_scout_agent.sql

Enhanced:
- ✓ server/agents/handlers/market-events-scout.ts (fixed autoApproveProposal call)
- ✓ server/utils/agents/event-scraping.ts (complete)
- ✓ server/utils/agents/appliers.ts (event_discovery handler)

Already Existed (ready to use):
- ✓ app/types/agent.types.ts (ProposalType: 'event_discovery', EventDiscoveryDetail interface)
- ✓ app/stores/agents.ts (proposal management)
- ✓ app/pages/admin/agents.vue (agent dashboard)
- ✓ server/utils/agents/proposals.ts (createProposal, autoApproveProposal)
- ✓ server/utils/agents/handlers.ts (handler registry)

## API Endpoints

### View Proposals
```
GET /admin/agents
Filter by: proposal_type = 'event_discovery'
```

### Approve/Reject Event
```
POST /api/agents/proposals/[id]/review
{
  "action": "approve" | "reject",
  "notes": "optional notes"
}
```

### Trigger Agent Manually
```
POST /admin/agents/[agent_id]/trigger
{
  "triggerType": "manual"
}
```

## Cost & Token Usage

- Average per run: 1,500-2,500 tokens
- Average cost per run: $0.10-$0.30 (using GPT-4 mini)
- Default budget: 10,000 tokens/day
- ~4 weeks of weekly runs within daily budget

## Example Discovered Event

When an event is discovered and approved, it appears in the calendar as:

```
Name: Montana Avenue Holiday Walk
Type: street_fair
Status: proposed (ready to confirm)
Date/Time: 2026-12-06, 12:00-20:00
Location: Montana Avenue, Santa Monica
Organizer: Main Street Association
Contact: Jenny Rice (marketing@mainstreetsm.com, 310-738-8711)
Expected Traffic: 8,000 people
Cost: $500
Description: [Full event description]
Notes: Discovered event from web search. Source: OpenAI Event Research.
       Confidence: 92%. Discovered on 2026-02-19

Ready to:
✓ Confirm/Schedule
✓ Assign staff
✓ Plan booth setup
✓ Track outcomes
```

## Support & Questions

See: docs/MARKETING_EVENTS_ENHANCEMENT.md for complete event system documentation
