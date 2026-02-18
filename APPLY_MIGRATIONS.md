# 🚀 Apply Database Migrations to Supabase

## Your Supabase Project Details
- **Project ID:** `uekumyupkhnpjpdcjfxb`
- **API URL:** `https://uekumyupkhnpjpdcjfxb.supabase.co`
- **Status:** ✅ Active and ready

## Step-by-Step: Manual Migration via Dashboard

### 1. Open Supabase Console
1. Go to: https://app.supabase.com
2. Sign in with your credentials
3. Select project "EmployeeGM" (or similar name)

### 2. Navigate to SQL Editor
1. In the left sidebar, find **"SQL Editor"**
2. Click on it
3. You should see a blank SQL editor

### 3. Run First Migration: API Error Tracking Tables

Copy the contents of this file:
📄 [`supabase/migrations/20260218_create_api_error_tracking.sql`](../../supabase/migrations/20260218_create_api_error_tracking.sql)

Then:
1. Open the SQL Editor
2. Click **"New query"** (or **"+"** button)
3. **Paste** the entire SQL from the file above
4. Click **"Run"** button (bottom right, usually)
5. Wait for the response (should show: "Queries Executed" with no errors)

**What gets created:**
- ✅ `api_error_logs` table (tracks all API errors)
- ✅ `api_error_trends` table (daily summaries)
- ✅ `missing_endpoints` table (404 tracking)
- ✅ 6 indexes for performance
- ✅ RLS policies for security
- ✅ Helper functions

### 4. Run Second Migration: Add Monitoring Page Access

Copy the contents of this file:
📄 [`supabase/migrations/20260218_add_api_monitoring_page.sql`](../../supabase/migrations/20260218_add_api_monitoring_page.sql)

Then:
1. Click **"New query"** again
2. **Paste** the entire SQL from the file above
3. Click **"Run"**
4. Wait for success message

**What gets created:**
- ✅ `/admin/api-monitoring` page definition
- ✅ Admin & Super Admin access rights

---

## Verifying Migrations Succeeded

### Check Tables Created
1. Go to **"Table Editor"** in left sidebar
2. Look for these new tables:
   - [ ] `api_error_logs`
   - [ ] `api_error_trends`
   - [ ] `missing_endpoints`

You should see them listed in the tables panel.

### Check Policies Applied
1. In the Table Editor, click on `api_error_logs`
2. Click the **"RLS"** tab (if available)
3. You should see policies:
   - `admin_read_all_errors`
   - `user_read_own_errors`
   - `service_insert_errors`

### Quick Test Query
In SQL Editor, run:
```sql
SELECT * FROM api_error_logs LIMIT 1;
```

Should return: empty result (0 rows, no error)

---

## What Happens Next?

Once migrations are applied:

✅ **Error Tracking Activates:** All API errors (4xx/5xx) get logged automatically  
✅ **Admin Dashboard Works:** `/admin/api-monitoring` becomes fully operational  
✅ **Missing Endpoints Tracked:** Any 404 automatically recorded  
✅ **Trends Calculated:** Daily summaries start accumulating  
✅ **Slack Alerts Ready:** (if webhook configured in Vercel)

---

## Troubleshooting

### "Table already exists" Error
**This is OK.** The migration uses `IF NOT EXISTS`, so re-running is safe.

### "Permission denied" Error
**Contact:** You may need super-user access. Check Supabase project settings.

### "Column does not exist" Error
Some columns might have different names. Check the actual table structure and adjust the migration if needed.

### "Function already exists" Error
Also OK - the migration handles this with `CREATE OR REPLACE`.

---

## Next Steps After Migrations

1. ✅ Run the migrations (this file)
2. 🔄 Redeploy to Vercel: `git push origin main`
3. 📊 Check dashboard: Visit `/admin/api-monitoring` (as Admin)
4. 🔔 (Optional) Setup Slack webhook in Vercel environment variables

---

**Credentials Location:** [`docs/SUPABASE_CREDENTIALS.md`](../SUPABASE_CREDENTIALS.md)  
**Documentation:** [`docs/PRODUCTION_ERROR_TRACKING_GUIDE.md`](../PRODUCTION_ERROR_TRACKING_GUIDE.md)
