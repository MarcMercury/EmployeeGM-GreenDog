# Marketing Calendar Color Coding System

## Overview
The Marketing Calendar now features a comprehensive 8-color coding system that automatically categorizes events for easy visual identification.

## Color Categories

| Color | Category | Description | Auto-Applied When |
|-------|----------|-------------|-------------------|
| 🟢 **GREEN** | `clinic_hosted` | CE or client-facing events at clinic | event_type is `ce_event`, `health_fair`, or `open_house` |
| 🟠 **ORANGE** | `offsite_tent` | Third-party events with tent setup | event_type is `street_fair`, `pet_expo`, or `adoption_event` |
| 🔴 **RED** | `offsite_street_team` | Street team only, no tent | event_type is `community_outreach` |
| 🩷 **PINK** | `donation_flyers` | Donation or flyers only | Manually set (not auto-detected) |
| 🟡 **AMBER** | `considering` | Events being considered | Manually set (not auto-detected) |
| ⚪ **GREY** | `awareness_day` | Awareness days/weeks/months | Event name contains "National/International/World Day/Week/Month" or "Awareness" or "Appreciation" |
| 🟡 **YELLOW** | `major_holiday` | Major holidays | Event name contains Christmas, Thanksgiving, New Year, Easter, Halloween, etc. |
| 🟤 **MAROON** | (completed override) | Completed events | Status is `completed` (overrides other colors) |

## Setup Instructions

### Step 1: Apply Database Migration

The color coding system requires adding an `event_category` column to the database.

**Option A: Via Supabase Dashboard** (Recommended)
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new)
2. Run the display script to get the SQL:
   ```bash
   npx tsx scripts/show-event-categories-migration.ts
   ```
3. Copy the SQL output
4. Paste into Supabase SQL Editor
5. Click "Run"

**Option B: View Migration File Directly**
The migration SQL is located at:
```
supabase/migrations/032_marketing_events_visual_categories.sql
```

### Step 2: Categorize Existing Events (Optional)

After applying the migration, existing events will already be categorized by the backfill UPDATE statements in the migration. However, if you want to re-run the categorization logic:

```bash
npx tsx scripts/apply-event-categories.ts
```

### Step 3: Deploy to Production

Once the migration is applied, commit and push any changes, then redeploy to Vercel:

```bash
git push origin main
# Vercel will auto-deploy
```

## Features

### Auto-Categorization
- **New events** are automatically categorized when created based on:
  - Event type (CE, street fair, community outreach, etc.)
  - Event name patterns (National Days, holidays, etc.)
- **Trigger function** runs on INSERT and UPDATE to assign categories
- **Manual override** available - you can change any event's category later

### Visual Legend
The calendar displays a color legend showing all event types for quick reference.

### Event Details
When viewing an event's details, the visual category is displayed with the corresponding color chip.

## Changing Event Categories

Event categories can be manually changed in the event editor:
1. Open an event's details
2. Look for the "Visual Category" field
3. Select from available categories
4. Save changes

The trigger will respect manual changes and won't override them unless the event_type is also changed.

## Examples

### Automatically Categorized Events:
- "National Dog Day" → `awareness_day` (Grey)
- "Christmas Day" → `major_holiday` (Yellow)
- "Venice Fest 2026" (community_outreach) → `offsite_street_team` (Red)
- "Health Fair" (health_fair) → `clinic_hosted` (Green)
- "Pet Expo" (pet_expo) → `offsite_tent` (Orange)

### Manually Set Categories:
- Event where you just dropped off flyers → `donation_flyers` (Pink)
- Event you're thinking about attending → `considering` (Amber)

## Troubleshooting

### Events not showing colors?
1. Ensure the migration has been applied to the database
2. Check that events have an `event_category` value
3. Try refreshing the calendar page

### Want to re-categorize all events?
Run the categorization script:
```bash
npx tsx scripts/apply-event-categories.ts
```

### Colors not matching legend?
Completed events always show as Maroon, overriding their category color.

## Technical Details

- **Database Column**: `marketing_events.event_category`
- **Type**: TEXT with CHECK constraint
- **Default**: `'general'`
- **Trigger**: `trigger_auto_assign_event_category`
- **Function**: `auto_assign_event_category()`
- **Index**: `idx_marketing_events_category`

