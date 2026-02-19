# System Stability Improvements

This document summarizes the stability improvements implemented to reduce errors, improve observability, and enhance system reliability.

## Overview

The following improvements were implemented based on a comprehensive stability analysis:

## Critical Priority ✅

### 1. Error Aggregation (Sentry)
**Files:**
- `app/plugins/sentry.client.ts` - Client-side error tracking
- `server/utils/sentry.ts` - Server-side error capture

**Features:**
- Vue error boundary integration
- Performance tracing with router integration
- Session replay for debugging
- Error filtering for common browser extensions
- User context on authenticated sessions

**Environment Variables Required:**
```
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 2. Store Reset on Logout
**File:** `app/stores/auth.ts`

Added `resetAllStores()` method that clears all Pinia stores on logout to prevent stale data from persisting between user sessions.

### 3. Consistent Fetch Wrapper (useSafeFetch)
**File:** `app/composables/useSafeFetch.ts`

**Features:**
- Automatic request timeouts (30s default)
- Retry logic for server errors
- Toast notifications on failure
- Type-safe response handling
- Helper methods: `useSafePost`, `useSafePut`, `useSafeDelete`

**Usage:**
```typescript
const { data, error, status } = await useSafeFetch('/api/employees', {
  timeout: 15000,
  retries: 2,
  showToast: true
})
```

## High Priority ✅

### 4. Server-Side Validation (Zod)
**File:** `server/utils/validation.ts`

**Features:**
- Request body validation with `validateBody()`
- Query parameter validation with `validateQuery()`
- Route params validation with `validateParams()`
- Common schemas: pagination, date ranges, UUID, employees, etc.

**Usage:**
```typescript
import { validateBody, employeeSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const data = await validateBody(event, employeeSchema)
  // data is typed and validated
})
```

### 5. Session Refresh Listener
**File:** `app/plugins/auth.client.ts`

**Features:**
- Listens to all Supabase auth state changes
- Handles: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
- Periodic session check every 5 minutes
- Auto-redirects to login if session expires

### 6. New Cron Jobs
**Files:**
- `server/api/cron/metrics-recalc.get.ts` - Weekly metrics refresh (Mondays 6am UTC)
- `server/api/cron/cleanup-stale.get.ts` - Orphaned data cleanup (Sundays 4am UTC)

**Vercel Configuration:** Added to `vercel.json`

**Metrics Refresh:**
- Recalculates employee tenure
- Refreshes referral partner aggregate stats
- Validates schedule hour totals

**Cleanup:**
- Removes expired sessions (30+ days)
- Clears read notifications (90+ days)
- Archives old activity logs (180+ days)
- Reports on stale pending users (7+ days)
- Identifies orphaned employee records

## Medium Priority ✅

### 7. Structured Logging
**File:** `server/utils/logger.ts`

**Features:**
- JSON-formatted logs for production parsing
- Log levels: debug, info, warn, error
- Domain-specific helpers: `logger.api()`, `logger.db()`, `logger.cron()`
- Error stack trace capture
- Context metadata support

**Usage:**
```typescript
import { logger } from '~/server/utils/logger'

logger.api('users', 'fetch', { userId: '123' })
logger.error('Something failed', error, { context: 'details' })
```

### 8. Server-Side API Caching
**File:** `server/utils/cache.ts`

**Features:**
- In-memory caching with TTL
- Cache key helpers for common patterns
- HTTP Cache-Control header utilities
- Automatic expired entry cleanup
- Cache invalidation by key or prefix

**Usage:**
```typescript
import { getCached, CACHE_TTL, setCacheHeaders, cacheKey } from '~/server/utils/cache'

// Get cached or fetch fresh
const employees = await getCached(
  cacheKey.list('employees'),
  () => supabase.from('employees').select('*'),
  CACHE_TTL.MEDIUM
)

// Set HTTP cache headers
setCacheHeaders(event, { maxAge: 60, staleWhileRevalidate: 30 })
```

## Environment Variables

Add these to your Vercel project:

```env
# Sentry (optional but recommended)
SENTRY_DSN=your-sentry-dsn

# Cron job security (recommended)
CRON_SECRET=your-random-secret
```

## Architecture Notes

### Store Separation (Not Consolidated)
After analysis, the employee-related stores were determined to serve different purposes and should NOT be consolidated:

- **`useEmployeeStore`** - Admin view of ALL employees (used by operations/schedule management)
- **`useUserStore`** - Current logged-in user's own profile/employee data
- **`useAuthStore`** - Authentication state and RBAC roles

These separations provide proper separation of concerns and prevent unnecessary data loading.

## Testing Recommendations

While automated testing wasn't included in this phase, consider adding:

1. Unit tests for composables (`useSafeFetch`, validation schemas)
2. Integration tests for cron jobs
3. E2E tests for authentication flow
4. Store reset verification tests

## Monitoring

With Sentry configured, monitor for:
- JavaScript runtime errors
- API endpoint failures
- Performance bottlenecks
- Session expiration issues

Set up alerts for error spikes and performance degradation.
