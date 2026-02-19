# Marketing Events Scout Agent - Quick Start

## 1. Apply the Migration

The agent is registered with a SQL migration. You have two options:

### Option A: Apply via Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copy contents of: `supabase/migrations/20260219000003_register_market_events_scout_agent.sql`
3. Paste into SQL editor
4. Click "Run"
5. Confirm success message

### Option B: Via Migrations CLI
```bash
# Run all pending migrations
npm run db:push
# or
supabase db push
```

## 2. Activate the Agent

### Via Supabase Dashboard
1. Go to Admin → Agents page
2. Find "Marketing Events Scout" in the Agent Roster
3. Click the status toggle to change from "paused" → "active"
4. Optional: Adjust the cron schedule or configuration

### Via SQL
```sql
UPDATE public.agent_registry
SET status = 'active'
WHERE agent_id = 'market_events_scout';
```

## 3. Run the Agent

### Automatic (Scheduled)
- Runs every Sunday at 6 AM
- Set via cron: `0 6 * * 0`
- Change in agent config if desired

### Manual (Immediate)
1. Admin → Agents → Agent Roster
2. Find "Marketing Events Scout"
3. Click "Run Now" button
4. Wait for completion (~30 seconds)
5. View results in Proposals tab

## 4. Review Discovered Events

### View Proposals
1. Admin → Agents → Proposals tab
2. Filter by "event_discovery" in the proposal type dropdown
3. Scroll through pending proposals
4. Each shows:
   - Event name & date
   - Location & organizer
   - Confidence score
   - Contact info
   - Description

### Approve Event
1. Click the proposal
2. Review the details
3. Click "Approve" button
4. Event is automatically added to Marketing Calendar
5. Status changes to "proposed" (ready to confirm)

### Reject Event
1. Click the proposal
2. If not relevant, click "Reject"
3. Add optional notes
4. Event is discarded

## 5. Find Events in Calendar

### Marketing Events Calendar
1. Growth → Events → Calendar view
2. Filter status: "proposed" to see newly discovered events
3. Or List view to see all
4. Click event to view full details
5. Update status to "confirmed" when ready to schedule

### Event Details Include
- Name, date, time, location
- Contact information (name, email, phone)
- Expected attendance
- Event cost
- Organizing entity
- Basic description
- Confidence score & source

## 6. Customize the Agent

### Change Location
1. Admin → Agents → Agent Roster
2. Click "Marketing Events Scout"
3. Edit config → change "location"
4. Save
5. Default is Los Angeles, California

### Add Custom Keywords
1. Edit agent config
2. Add to "keywords" array:
   ```json
   "keywords": [
     ... existing keywords ...,
     "custom event type",
     "specific fundraiser",
     "niche event"
   ]
   ```
3. Save

### Adjust Confidence Threshold
1. Edit agent config
2. Change "autoApproveThreshold" (0.0 to 1.0)
   - 0.7 = approve 70% confidence events
   - 0.8 = approve 80% confidence events
   - 0.9 = approve only 90%+ confidence events
3. Save

### Change Schedule
Edit the cron expression:
- `0 6 * * 0` = Every Sunday 6 AM (current)
- `0 6 * * *` = Every day 6 AM
- `0 6,14 * * *` = Every day 6 AM & 2 PM
- `0 */6 * * *` = Every 6 hours

## 7. Monitor Performance

### Check Recent Runs
1. Admin → Agents → Agent Roster
2. Click "Marketing Events Scout"
3. View "Last Run" status and time
4. Click run ID to see details

### Proposal Status
- Pending = waiting for human review
- Auto-approved = high-confidence, approved automatically
- Approved = human reviewed & approved
- Applied = added to calendar
- Rejected = not relevant
- Expired = past 30-day window

### Metrics
- Events discovered per run
- Auto-approval rate (% of high-confidence)
- Token cost (~$0.10-$0.30 per run)
- Error rate

## 8. Expected Outcomes

### After First Run
- 10-20 event proposals created
- 40-60% auto-approved (high confidence)
- 40-60% pending review (lower confidence)

### Weekly Pattern
- Sunday 6 AM trigger
- ~15 minutes to complete
- 100-150 events discovered per month
- 50-80% quality rate on auto-approved

### Monthly Growth
- Proposed events added to calendar
- Organizers contacted for details
- Events scheduled & staffed
- Post-event metrics tracked

## 9. Troubleshooting

### Agent Not Running
```sql
-- Check agent status
SELECT agent_id, status, schedule_cron, last_run_at 
FROM public.agent_registry 
WHERE agent_id = 'market_events_scout';

-- Should show: status = 'active'
```

### No Proposals Created
1. Check: Was agent actually run? (check last_run_at)
2. Check: Do error messages exist in agent_runs?
3. Try: Lower confidence threshold to see any results
4. Try: Add test keywords to config

### Poor Quality Events
1. Check confidence scores in proposals
2. Increase autoApproveThreshold (only high-confidence auto-approved)
3. Refine keywords to be more specific
4. Add event_type filters

### Too Many Events
1. Decrease search radius in config
2. Narrow keyword list
3. Increase confidence threshold
4. Reduce daily_token_budget to limit runs

## 10. Next Steps

After events are discovered:

### Prepare Event
1. ✓ Review discovered event details
2. ✓ Contact organizer to confirm attendance
3. ✓ Plan booth setup (tent, tables, materials)
4. ✓ Create schedule for staff shifts

### Schedule Staff
1. Growth → Scheduling
2. Add event to master calendar
3. Assign staff to shifts
4. Set break times

### Track Results
1. After event, log attendance
2. Record leads captured
3. Note revenue/expenses
4. Update event status to "completed"

## Cost & Budget

- **Tokens per run:** ~2,000 tokens
- **Cost per run:** ~$0.20 (GPT-4 mini)
- **Daily budget:** 10,000 tokens (5 runs)
- **Monthly cost:** ~$25 for weekly runs
- **ROI:** Significant (eliminates manual research time)

## Commands Reference

```bash
# Check agent status
curl https://YOUR_DOMAIN/api/agents/market_events_scout

# Trigger immediate run
curl -X POST https://YOUR_DOMAIN/api/agents/market_events_scout/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"

# List all proposals
curl https://YOUR_DOMAIN/api/agents/proposals?type=event_discovery
```

## Support

📖 Full Doc: `docs/MARKETING_EVENTS_SCOUT_AGENT.md`
🔍 Validation: Run queries in `docs/MARKETING_EVENTS_SCOUT_VALIDATION.sql`
🐛 Issues: Check `server/agents/handlers/market-events-scout.ts` logs
