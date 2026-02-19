# Quick Start: Apply Marketing Events Enhancement

## Step 1: Apply Database Migration

### Option A: Supabase Dashboard (Recommended)
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copy the entire contents of `APPLY_MARKETING_EVENTS_MIGRATION.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Wait for success confirmation

### Option B: View Individual Migrations
If you prefer to apply migrations separately:
- **Schema Changes**: `supabase/migrations/20260219000001_marketing_events_detailed_fields.sql`
- **Event Data**: `supabase/migrations/20260219000002_seed_montana_avenue_holiday_walk.sql`

## Step 2: Verify Changes

After applying the migration, the following will be available:

### ✅ New Event Form Fields
- Event Host & Cost section
- Payment Details (status, date)
- Vendor Status
- Expectations / Our Involvement
- Physical Setup Details
- Communication Log Timeline

### ✅ Montana Avenue Holiday Walk Event
- Event will appear in your Marketing Events Calendar
- All details pre-populated including:
  - Contact: Jenny Rice (marketing@mainstreetsm.com, 310-738-8711)
  - Date: Saturday, December 6, 2026 (12pm-8pm)
  - Cost: $500 (PAID on 11/7/2025)
  - Staffing: 4 people assigned in shifts
  - Communication history with 3 logged entries

## Step 3: Using the New Features

### Create a New Event
1. Go to Marketing → Events
2. Click "Create Event"
3. Fill in all sections including new fields
4. Add communication log entries as you contact organizers
5. Track payment status

### View Event Details
1. Click on any event in the calendar/list
2. See comprehensive details organized in tabs
3. View communication timeline
4. Track payment and vendor status

## What Changed?

### Database
- 8 new columns added to `marketing_events` table
- New index for payment status filtering
- Montana Avenue event record inserted

### Frontend
- EventFormDialog.vue - Enhanced with 4 new sections
- EventProfileDialog.vue - Enhanced display with timeline
- Types updated for full TypeScript support

## Need Help?

See full documentation: `docs/MARKETING_EVENTS_ENHANCEMENT.md`

## Rollback (if needed)

To remove the new fields (not recommended):
```sql
ALTER TABLE public.marketing_events
  DROP COLUMN IF EXISTS hosted_by,
  DROP COLUMN IF EXISTS event_cost,
  DROP COLUMN IF EXISTS expectations,
  DROP COLUMN IF EXISTS physical_setup,
  DROP COLUMN IF EXISTS communication_log,
  DROP COLUMN IF EXISTS vendor_status,
  DROP COLUMN IF EXISTS payment_date,
  DROP COLUMN IF EXISTS payment_status;

DROP INDEX IF EXISTS idx_marketing_events_payment_status;

-- To remove only the Montana Avenue event:
DELETE FROM public.marketing_events WHERE name = 'Montana Avenue Holiday Walk';
```
