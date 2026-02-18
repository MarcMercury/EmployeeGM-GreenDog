# 🚀 Quick Deployment: API Error Tracking System

## Prerequisites Checklist
- ✅ All code committed (you have a fresh branch or on main)
- ✅ Have Supabase project access
- ✅ Have Vercel project access
- ✅ (Optional) Have Slack workspace admin access

---

## Step 1: Apply Database Migrations (5 minutes)

### Option A: Using Supabase CLI (Recommended)
```bash
# Navigate to project
cd /workspaces/EmployeeGM-GreenDog

# Push all migrations
supabase db push

# Verify migrations applied
supabase db list-migrations
```

### Option B: Manual in Supabase Dashboard
1. Go to [Supabase Console](https://app.supabase.com)
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Create new query
5. Copy each migration file content and run:
   - `supabase/migrations/20260218_create_safety_logs_table.sql` (if not done earlier)
   - `supabase/migrations/20260218_create_api_error_tracking.sql`
   - `supabase/migrations/20260218_add_api_monitoring_page.sql`

### Verification
In Supabase, check these tables exist:
- [ ] `api_error_logs` (tracks errors)
- [ ] `api_error_trends` (daily summary)
- [ ] `missing_endpoints` (404 tracking)
- [ ] `safety_logs` (from earlier migration)

---

## Step 2: Optional - Setup Slack Alerts (10 minutes)

### Skip if you don't want Slack notifications

### Get Slack Webhook URL
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "EmployeeGM Error Tracking"
4. Select your workspace
5. In left menu: "Incoming Webhooks"
6. Toggle "Activate Incoming Webhooks" **ON**
7. Click "Add New Webhook to Workspace"
8. Select a channel (recommend: `#engineering` or `#alerts`)
9. Click "Allow"
10. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T.../B.../X...`)

### Add to Vercel
1. Go to [Vercel Project Settings](https://vercel.com/dashboard)
2. Find your EmployeeGM project
3. Click "Settings"
4. Click "Environment Variables" in left sidebar
5. Click "Add new"
6. **Name:** `SLACK_WEBHOOK_URL`
7. **Value:** Paste the webhook URL from above
8. **Select environments:** Check "Production"
9. Click "Add"

**Important:** You DON'T redeploy yet!

---

## Step 3: Deploy to Vercel (5 minutes)

### Automatic (Recommended)
```bash
# Done! Next push to main automatically deploys
git push origin main

# Or if on a different branch:
git push origin your-branch-name
```

### Manual
```bash
# Deploy immediately
vercel deploy --prod
```

### Verify Deployment
- Go to [Vercel Dashboard](https://vercel.com)
- You should see a new deployment
- Wait for "Ready" status (green checkmark)

---

## Step 4: Test the System (5 minutes)

### Test 1: Trigger a 404 Error
```bash
# In terminal (or browser console if you know the URL)
curl https://YOUR-DOMAIN.com/api/definitely-does-not-exist-12345
```

### Test 2: Check Browser Console
1. Go to your app: `https://YOUR-DOMAIN.com`
2. Open browser console: `F12` or `Cmd+Option+I`
3. Look for error message like:
   ```
   ❌ API 404: GET /api/definitely-does-not-exist-12345
   ```

### Test 3: Check Dashboard
1. Go to: `https://YOUR-DOMAIN.com/admin/api-monitoring`
2. You should see:
   - [ ] "24h Errors" card shows a number > 0
   - [ ] "Missing 404s" card shows 1
   - [ ] Click "Missing Endpoints" tab
   - [ ] See `/api/definitely-does-not-exist-12345` listed

### Test 4: Check Slack (if configured)
- Check your Slack channel
- Should see a message like:
  ```
  🚨 Missing API Endpoint Detected
  Endpoint: /api/definitely-does-not-exist-12345
  ...
  ```

If you don't see it after 5 minutes:
1. Check SLACK_WEBHOOK_URL is correctly set in Vercel
2. Check webhook URL is still valid (Slack sometimes rotates them)
3. Check server logs: `vercel logs --prod`

---

## Step 5: Enable CI/CD Validation (5 minutes)

This automatically blocks PRs with missing endpoints.

### Already Enabled!
The GitHub Actions workflow at `.github/workflows/endpoint-validation.yml` is automatically:
- ✅ Running on every PR
- ✅ Running on every push to main
- ✅ Failing if missing endpoints detected
- ✅ Commenting on PRs with results

**Try it:**
```bash
# Create a test branch
git checkout -b test/validation-system

# Modify a file to trigger the workflow
echo "// test" >> app/app.vue

# Commit and push
git add app/app.vue
git commit -m "Test CI/CD validation"
git push origin test/validation-system

# Go to GitHub → Pull Request → checks
# You should see:
# ✅ "Endpoint Validation" check passed
```

---

## Step 6: Update Team (2 minutes)

Tell your team:
```
🎉 Production Error Tracking is Live!

New Features:
✅ Auto-detects missing API endpoints
✅ Real-time error dashboard at /admin/api-monitoring
✅ Daily health checks (2 AM UTC)
✅ Slack alerts for critical issues
✅ CI/CD validation (PRs fail if endpoints missing)

New Workflow:
1. Create API endpoint first
2. Test with curl/Postman
3. Create frontend code
4. CI/CD validates automatically
5. Deploy with confidence

Questions? See docs/PRODUCTION_ERROR_TRACKING_GUIDE.md
```

---

## Troubleshooting Deployment

### Problem 1: Migration Failed
**Error:** `relation "api_error_logs" already exists`  
**Solution:** Tables already created, that's OK

**Error:** `permission denied` in Supabase  
**Solution:** 
1. Check you have admin access to Supabase project
2. Try using Supabase dashboard SQL editor instead of CLI

### Problem 2: Dashboard Shows "Admin access required"
**Error:** When visiting `/admin/api-monitoring` get error  
**Solution:** 
1. Sign in as admin user
2. Check user role in database: `SELECT role FROM profiles WHERE email = 'your@email.com';`
3. Should show: `super_admin` or `admin`

### Problem 3: Cron Job Not Running
**Error:** Nothing in logs at 2 AM UTC  
**Solution:**
1. Check Vercel project → "Cron Jobs" enabled
2. Log in to `vercel logs --prod` and search for `/api/cron/endpoint-health-check`
3. May take 24 hours to trigger first time

### Problem 4: No Errors Showing Up
**Error:** Dashboard is empty after 10 minutes  
**Check:**
1. Did you trigger a real error? (404, 500, etc.)
2. Open browser console (F12) - any errors?
3. Check browser network tab - is `POST /api/system/track-api-errors` being called?
4. Check database: `SELECT COUNT(*) FROM api_error_logs;` should be > 0

---

## Health Check

If everything worked:
- ✅ Database tables exist
- ✅ Error tracking composable initialized
- ✅ Admin dashboard accessible
- ✅ 404 errors show in dashboard within 5 minutes
- ✅ (Optional) Slack notifications working
- ✅ CI/CD validation running on PRs

---

## Next Steps

### Immediate (Today)
1. ✅ Deploy (Step 3)
2. ✅ Test (Step 4)
3. ✅ Tell team (Step 6)

### This Week
- Monitor `/admin/api-monitoring` for any errors
- Check Slack for alerts
- Create any missing endpoints found

### This Month
- Let the health check run daily
- Review trend data
- Adjust Slack channel if needed

### Ongoing
- Before creating UI, create API endpoint
- Before deploying, run `node scripts/audit-all-endpoints.ts`
- Use dashboard for troubleshooting

---

## Quick Reference

### Monitoring
- **Dashboard:** `https://YOUR-DOMAIN.com/admin/api-monitoring`
- **Logs:** `vercel logs --prod | grep track-api`
- **Database:** 
  ```sql
  SELECT * FROM api_error_logs ORDER BY timestamp DESC LIMIT 10;
  SELECT * FROM missing_endpoints WHERE reported = false;
  ```

### Manual Testing
```bash
# Trigger 404
curl https://YOUR-DOMAIN.com/api/test-404

# Trigger 500
curl https://YOUR-DOMAIN.com/api/test-500

# Check errors collected
# Go to /admin/api-monitoring and wait 5 seconds
```

### Documentation
- Full guide: `docs/PRODUCTION_ERROR_TRACKING_GUIDE.md`
- Endpoint audit: `docs/ENDPOINT_ARCHITECTURE_GUIDE.md`
- This quick start: `docs/PRODUCTION_ERROR_TRACKING_DEPLOYMENT.md`

---

**Total Time to Deploy: ~20 minutes** ⏱️

**When complete, you'll have:**
- ✅ Zero missing endpoints going unnoticed
- ✅ Real-time monitoring dashboard
- ✅ Automatic Slack alerts
- ✅ CI/CD protection
- ✅ Production-ready error tracking

🎉 **You're done! The system is live and protecting your application.**
