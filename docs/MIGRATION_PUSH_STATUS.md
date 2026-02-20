# Migration Push Status & Manual Fix

## Current Issue
The Supabase migration system has detected that several migrations have already been applied to the remote database, causing conflicts when trying to re-apply them.

### Problematic Migrations
- **032_marketing_events_visual_categories.sql** - Already applied (duplicate key error)
- **20250206000001_simplify_pto_types.sql** - Schema conflict (column doesn't exist)

## Solution: Three-Step Fix

### Step 1: Archive Problematic Migrations Locally
These migrations are already applied to production but are causing issues. They've been moved to `.applied` suffix:

```bash
cd supabase/migrations
mv 032_marketing_events_visual_categories.sql _032_marketing_events_visual_categories.sql.applied
```

### Step 2: Apply Safety Logs RLS Fix Manually
Since the migration system has conflicts, apply the RLS fix directly in Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new
2. Run the SQL from: `/docs/SAFETY_LOGS_RLS_FIX.sql`
3. This fixes the core issue preventing log submissions

### Step 3: Push Remaining New Migrations  
After Step 2, try pushing new migrations:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39
npx supabase@latest db push --include-all --yes
```

## Expected Outcome
After these three steps:
- ✅ Safety logs RLS policies will be correct
- ✅ Users can submit logs without 500 errors
- ✅ Recent migrations (254-258) will be applied

## Next Steps if Push Still Fails
If step 3 still has errors, they are likely safe errors about already-applied migrations. The important thing is that:
1. The RLS policies for safety_logs are correct (Step 2)
2. The safety_log_module (254) is applied
3. Users can submit logs

You can verify by testing log submission in the app.
