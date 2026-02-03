# 🧪 System Verification & Testing Guide

> **Pre-Launch Checklist for EmployeeGM**

## Quick Tests You Can Run Now

### 1. 🌐 Backend API Health Check (Browser)

Open these URLs in your browser while the app is running:

```text
https://your-app-url/api/system-health
```

This checks:

- ✅ Database connectivity
- ✅ Auth service health
- ✅ Environment variables

**Expected Response:**

```json
{
  "status": "healthy",
  "checks": [
    { "name": "database", "status": "ok", "latency": 42 },
    { "name": "auth", "status": "ok", "latency": 15 },
    { "name": "environment", "status": "ok" }
  ]
}
```

---

## 2. 🔐 Auth Flow Tests (Manual in Browser)

### Test New User Registration

1. Go to `/auth/login`
2. Click "Sign Up" or registration link
3. Enter a test email (use a real email you can access)
4. Complete registration
5. Check email for confirmation link
6. Click confirmation link
7. Verify redirect to dashboard

### Test Existing User Login

1. Go to `/auth/login`
2. Enter valid credentials
3. Verify successful login
4. Check that user profile loads correctly
5. Test navigation to protected routes

### Test Password Reset

1. Go to `/auth/login`
2. Click "Forgot Password"
3. Enter email
4. Check for reset email
5. Complete password reset flow

---

## 3. 📊 Database Verification (Supabase Dashboard)

Go to your Supabase Dashboard → SQL Editor and run:

### Check Critical Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 
    'employees', 
    'notifications', 
    'marketing_events',
    'marketing_calendar_notes'
  );
```

**Expected:** All 5 tables listed

### Check User/Auth Linkage

```sql
SELECT 
  COUNT(*) as total_employees,
  COUNT(profile_id) as with_profile,
  (SELECT COUNT(*) FROM profiles WHERE auth_user_id IS NOT NULL) as can_login
FROM employees 
WHERE employment_status = 'active';
```

**Expected:** `can_login` should match your active user count

### Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'employees', 'notifications');
```

**Expected:** All should show `rowsecurity = true`

### Verify Marketing Notification Trigger

```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'marketing_event_notification_trigger';
```

**Expected:** `tgenabled = 'O'` (enabled)

### Check Trigger Function Works (Safe Test)

```sql
-- This just checks the function exists and compiles
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'notify_marketing_event_created';
```

---

## 4. 🔔 Notification System Test

### In Browser Console (while logged in)

```javascript
// Check if notifications load
const { data, error } = await $fetch('/api/notifications')
console.log('Notifications:', data, error)
```

### Via Supabase SQL Editor

```sql
-- Check recent notifications
SELECT id, profile_id, type, category, title, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 5. 📅 Marketing Calendar Test

### Manual Browser Tests

1. Navigate to `/marketing/calendar`
2. Click on a day → Verify "Create Event" and "Create Note" options appear
3. Create a test event:
   - Fill in event name, date, location
   - Save the event
   - **Verify no errors in console**
4. Check notifications were created (if trigger is working)

### Verify Event Save Works

```sql
-- After creating an event, check it exists
SELECT id, name, event_date, event_type, created_at 
FROM marketing_events 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 6. 🛡️ RLS Policy Tests

### Test Unauthenticated Access (New Incognito Window)

1. Open incognito/private window
2. Try to access `/dashboard` → Should redirect to `/auth/login`
3. Try to access `/api/user/profile` → Should return 401

### Test Role-Based Access

1. Log in as a regular user (not admin)
2. Try to access `/admin/*` routes → Should be blocked
3. Try to access `/gdu/*` routes → Should work based on permissions

---

## 7. 🖥️ Frontend Smoke Tests

### Critical Pages to Load

- [ ] `/auth/login` - Login page loads
- [ ] `/dashboard` - Dashboard loads after login
- [ ] `/profile` - User profile loads
- [ ] `/marketing/calendar` - Calendar renders
- [ ] `/activity` - Activity hub shows notifications
- [ ] `/employees` - Employee list loads (if permitted)

### Check Browser Console For

- ❌ No red errors
- ❌ No 401/403 API errors
- ❌ No "undefined" or null reference errors
- ✅ All API calls return 200

---

## 8. 🚀 Production Readiness Checklist

### Environment Variables (Vercel/Hosting)

- [ ] `SUPABASE_URL` - Set correctly
- [ ] `SUPABASE_KEY` - Anon key for client
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Server-side only
- [ ] `SLACK_BOT_TOKEN` - If using Slack integration
- [ ] `OPENAI_API_KEY` - If using AI features
- [ ] `RESEND_API_KEY` - If sending emails

### Security Checks

- [ ] RLS enabled on all sensitive tables
- [ ] Service role key NOT exposed to client
- [ ] Auth redirects working properly
- [ ] CORS configured correctly

### Performance

- [ ] Database indexes exist on frequently queried columns
- [ ] No N+1 queries in critical paths
- [ ] API responses under 500ms

---

## 9. 📝 Run Verification Script Locally

Create a `.env` file with:

```env
SUPABASE_URL=https://uekumyupkhnpjpdcjfxb.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then run:

```bash
npx tsx scripts/system-verification.ts
```

---

## 10. 🔧 Common Issues & Fixes

### "Saving event failed" (400 error)

**Cause:** Trigger function references non-existent column
**Fix:** Applied - trigger updated to remove `AND status = 'active'`

### "User can't log in"

**Check:**

```sql
SELECT p.email, p.auth_user_id, e.employment_status
FROM profiles p
JOIN employees e ON e.profile_id = p.id
WHERE p.email = 'user@example.com';
```

- Verify `auth_user_id` is not null
- Verify `employment_status = 'active'`

### "No notifications appearing"

**Check:**

```sql
SELECT * FROM notifications 
WHERE profile_id = 'user-profile-id' 
ORDER BY created_at DESC;
```

### "Calendar not loading"

**Check browser console for:**

- API errors
- RLS policy violations
- Missing permissions

---

## Summary: Quick Test Commands

| Test              | How                                       |
| ----------------- | ----------------------------------------- |
| Health Check      | `GET /api/system-health`                  |
| Auth Diagnostic   | `npx tsx scripts/auth-diagnostic.ts`      |
| Auth Status       | `npx tsx scripts/check-auth-status.ts`    |
| Full Verification | `npx tsx scripts/system-verification.ts`  |
| Marketing Event   | Create event in `/marketing/calendar`     |
