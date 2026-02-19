# 🏥 System Health & Scalability Roadmap

> **Strategic recommendations for long-term reliability, scalability, and AI integration**
> Generated: January 20, 2026

## 🚀 PHASED IMPLEMENTATION

All recommendations have been broken into **6 database migrations** that can be run sequentially:

| Phase | Migration File | Priority | Purpose |
|-------|---------------|----------|---------|
| **Phase 1** | `137_phase1_data_integrity.sql` | 🔴 CRITICAL | Data validation constraints, normalization triggers |
| **Phase 2** | `138_phase2_performance_indexes.sql` | 🔴 CRITICAL | Performance indexes for common queries |
| **Phase 3** | `139_phase3_health_monitoring.sql` | 🟡 HIGH | Health check functions, performance logging |
| **Phase 4** | `140_phase4_audit_enhancements.sql` | 🟡 HIGH | Audit log immutability, enhanced logging |
| **Phase 5** | `141_phase5_ai_infrastructure.sql` | 🟢 MEDIUM | AI usage tracking, schedule/document tables |
| **Phase 6** | `142_phase6_advanced_features.sql` | 🟢 LOW | NL queries, insights, predictions, compliance |

### Running the Migrations

```bash
# Run all phases at once
supabase db push

# Or run individually in Supabase Dashboard SQL Editor
# Copy/paste each migration file in order
```

---

## Executive Summary

Your Employee GM system has solid foundations, but there are strategic improvements that will make it more robust as you scale to more users, more data, and more complex operations. This document outlines:

1. **Database Integrity & Performance** - Ensuring data consistency at scale
2. **API Layer Hardening** - Reliable, observable, self-healing backend
3. **Frontend-Backend Synchronization** - Guaranteed data consistency
4. **AI Integration Roadmap** - Intelligent automation opportunities
5. **Monitoring & Observability** - Know before users complain

---

## 📊 Current State Assessment

### ✅ What You're Doing Right

| Area | Current Implementation |
|------|----------------------|
| **Auth/RBAC** | Role-based middleware with proper RLS policies |
| **Retry Logic** | `apiRetry.ts` with exponential backoff + jitter |
| **Audit Trail** | Comprehensive `audit_log` table with triggers |
| **Data Layer** | `useDatabase` composable with friendly errors |
| **Caching** | `useAppData` with TTL-based cache + invalidation |
| **Validation** | Zod schemas via `useFormValidation` |
| **Type Safety** | TypeScript + generated Supabase types |

### ⚠️ Areas Needing Improvement

| Area | Gap | Risk Level |
|------|-----|-----------|
| **Optimistic Updates** | Not consistent - some pages wait for server | Medium |
| **Stale Data Detection** | Cache invalidation is manual | High |
| **API Error Boundaries** | No centralized error recovery | Medium |
| **Database Constraints** | Some missing CHECK constraints | High |
| **Background Jobs** | No queue for async processing | Medium |
| **AI Integration** | OpenAI keys exist but no features implemented | Low |

---

## 1. 🗄️ Database Integrity & Performance

### 1.1 Add Missing Constraints

Create a migration to enforce data integrity at the database level:

```sql
-- Priority: HIGH - Data corruption prevention

-- Ensure email uniqueness across employees
ALTER TABLE employees ADD CONSTRAINT employees_email_unique 
  UNIQUE (email_work) WHERE email_work IS NOT NULL AND is_active = true;

-- Ensure valid date ranges
ALTER TABLE employees ADD CONSTRAINT employees_dates_valid
  CHECK (hire_date <= COALESCE(termination_date, '2100-01-01'::date));

-- Ensure shift times are valid
ALTER TABLE shifts ADD CONSTRAINT shifts_times_valid
  CHECK (start_time < end_time OR (end_time < start_time AND is_overnight = true));

-- Ensure PTO balance can't go negative
ALTER TABLE pto_balances ADD CONSTRAINT pto_balance_non_negative
  CHECK (balance >= 0);

-- Ensure audit log immutability via trigger
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

### 1.2 Add Database Indexes for Common Queries

```sql
-- Performance indexes for multi-user access patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_active_dept 
  ON employees(department_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_schedule_date 
  ON shifts(schedule_week_id, shift_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_stage_created 
  ON candidates(pipeline_stage, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_off_pending 
  ON time_off_requests(approver_id, created_at) WHERE status = 'pending';
```

### 1.3 Add Database Health Monitoring Function

```sql
-- Creates a health check function for monitoring
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'total_employees', (SELECT count(*) FROM employees WHERE is_active = true),
    'pending_time_off', (SELECT count(*) FROM time_off_requests WHERE status = 'pending'),
    'unread_notifications', (SELECT count(*) FROM notifications WHERE read_at IS NULL),
    'recent_audit_entries', (SELECT count(*) FROM audit_log WHERE created_at > now() - interval '1 hour'),
    'orphaned_profiles', (
      SELECT count(*) FROM profiles p 
      WHERE p.auth_user_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.auth_user_id)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
```

---

## 2. 🔌 API Layer Hardening

### 2.1 Centralized API Error Handler

Create a server utility for consistent error handling:

```typescript
// server/utils/apiHandler.ts
import { H3Event, createError } from 'h3'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    timestamp: string
    requestId: string
    duration?: number
  }
}

export const createApiHandler = <T>(
  handler: (event: H3Event) => Promise<T>
) => {
  return async (event: H3Event): Promise<ApiResponse<T>> => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    
    try {
      const data = await handler(event)
      
      return {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          duration: Date.now() - startTime
        }
      }
    } catch (err: any) {
      // Log for observability
      console.error(`[API Error] ${requestId}:`, {
        path: event.path,
        method: event.method,
        error: err.message,
        stack: err.stack
      })
      
      // Map to user-friendly errors
      const errorCode = err.statusCode || 500
      const errorMessage = getPublicErrorMessage(err)
      
      throw createError({
        statusCode: errorCode,
        data: {
          success: false,
          error: {
            code: `ERR_${errorCode}`,
            message: errorMessage
          },
          meta: { timestamp: new Date().toISOString(), requestId }
        }
      })
    }
  }
}

function getPublicErrorMessage(err: any): string {
  // Never expose internal errors to clients
  const internalPatterns = [/constraint/i, /relation/i, /column/i, /syntax/i]
  const message = err.message || 'An unexpected error occurred'
  
  if (internalPatterns.some(p => p.test(message))) {
    return 'A database error occurred. Please try again.'
  }
  
  return message
}
```

### 2.2 Request Rate Limiting per User

Enhance the existing rate limiter:

```typescript
// server/utils/rateLimiter.ts
const userLimits = new Map<string, { count: number; resetAt: number }>()

export function checkUserRateLimit(
  userId: string, 
  limit: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const key = userId
  const existing = userLimits.get(key)
  
  if (!existing || existing.resetAt < now) {
    userLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (existing.count >= limit) {
    return false
  }
  
  existing.count++
  return true
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of userLimits) {
    if (value.resetAt < now) userLimits.delete(key)
  }
}, 60000)
```

### 2.3 API Versioning Strategy

Add version headers for future compatibility:

```typescript
// server/middleware/apiVersion.ts
export default defineEventHandler((event) => {
  // Add API version header
  setHeader(event, 'X-API-Version', '1.0')
  
  // Track API usage for deprecation planning
  const version = getHeader(event, 'X-Requested-API-Version')
  if (version && version !== '1.0') {
    console.warn(`[API] Client requesting version ${version}`)
  }
})
```

---

## 3. 🔄 Frontend-Backend Synchronization

### 3.1 Enhanced Cache Invalidation

Upgrade `useAppData` with smart invalidation:

```typescript
// Proposed enhancements to useAppData.ts

interface CacheInvalidationEvent {
  type: 'employees' | 'skills' | 'departments' | 'all'
  source: 'local' | 'realtime' | 'manual'
  timestamp: number
}

// Broadcast channel for cross-tab synchronization
const invalidationChannel = new BroadcastChannel('app-cache-invalidation')

export function setupRealtimeInvalidation() {
  const supabase = useSupabaseClient()
  
  // Subscribe to changes on critical tables
  supabase
    .channel('app-data-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'employees' 
    }, (payload) => {
      broadcastInvalidation('employees', 'realtime')
    })
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'skill_library' 
    }, (payload) => {
      broadcastInvalidation('skills', 'realtime')
    })
    .subscribe()
}

function broadcastInvalidation(type: CacheInvalidationEvent['type'], source: CacheInvalidationEvent['source']) {
  const event: CacheInvalidationEvent = { type, source, timestamp: Date.now() }
  invalidationChannel.postMessage(event)
  handleInvalidation(event)
}

// Listen for invalidations from other tabs
invalidationChannel.onmessage = (event) => {
  handleInvalidation(event.data)
}

function handleInvalidation(event: CacheInvalidationEvent) {
  // Only refetch if data is currently being used
  if (event.type === 'employees' || event.type === 'all') {
    invalidateAppDataCache('employees')
  }
  // ... other types
}
```

### 3.2 Optimistic Updates Pattern

Create a composable for consistent optimistic updates:

```typescript
// app/composables/useOptimisticUpdate.ts
export function useOptimisticUpdate<T>() {
  const pending = ref<Map<string, T>>(new Map())
  const failed = ref<Set<string>>(new Set())

  async function optimisticUpdate(
    id: string,
    optimisticValue: T,
    serverAction: () => Promise<T>,
    onRollback?: () => void
  ): Promise<T> {
    // Store original for rollback
    pending.value.set(id, optimisticValue)
    failed.value.delete(id)

    try {
      const result = await serverAction()
      pending.value.delete(id)
      return result
    } catch (error) {
      // Rollback on failure
      pending.value.delete(id)
      failed.value.add(id)
      onRollback?.()
      throw error
    }
  }

  function isPending(id: string): boolean {
    return pending.value.has(id)
  }

  function hasFailed(id: string): boolean {
    return failed.value.has(id)
  }

  return { optimisticUpdate, isPending, hasFailed }
}
```

### 3.3 Connection State Manager

Handle offline/online gracefully:

```typescript
// app/composables/useConnectionState.ts
export function useConnectionState() {
  const isOnline = ref(navigator.onLine)
  const lastOnline = ref(Date.now())
  const queuedActions = ref<Array<() => Promise<void>>>([])

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  function handleOnline() {
    isOnline.value = true
    // Process queued actions
    while (queuedActions.value.length > 0) {
      const action = queuedActions.value.shift()
      action?.().catch(console.error)
    }
  }

  function handleOffline() {
    isOnline.value = false
    lastOnline.value = Date.now()
  }

  function queueAction(action: () => Promise<void>) {
    if (isOnline.value) {
      action().catch(console.error)
    } else {
      queuedActions.value.push(action)
    }
  }

  return { isOnline, lastOnline, queueAction, queuedActions }
}
```

---

## 4. 🤖 AI Integration Roadmap

With unrestricted ChatGPT access, here are the highest-value AI features:

### 4.1 Priority 1: Smart Scheduling Assistant

**Use Case:** Auto-generate optimal schedules based on skills, availability, and business rules.

```typescript
// server/api/ai/schedule-suggest.post.ts
export default defineEventHandler(async (event) => {
  const { weekStart, departmentId } = await readBody(event)
  
  // Gather context
  const employees = await getAvailableEmployees(departmentId)
  const requirements = await getShiftRequirements(weekStart)
  const preferences = await getEmployeePreferences(employees.map(e => e.id))
  const constraints = await getScheduleRules()
  
  const prompt = `
    You are a veterinary hospital scheduling expert. Create an optimal weekly schedule.
    
    EMPLOYEES:
    ${JSON.stringify(employees, null, 2)}
    
    SHIFT REQUIREMENTS:
    ${JSON.stringify(requirements, null, 2)}
    
    PREFERENCES & CONSTRAINTS:
    ${JSON.stringify({ preferences, constraints }, null, 2)}
    
    Generate a schedule that:
    1. Covers all required shifts
    2. Respects employee certifications (only certified staff for surgery, etc.)
    3. Distributes weekend shifts fairly
    4. Minimizes back-to-back closing-opening shifts
    5. Maximizes preference satisfaction
    
    Return as JSON: { shifts: [{ employeeId, date, startTime, endTime, role }] }
  `
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(response.choices[0].message.content)
})
```

### 4.2 Priority 2: Skill Gap Analyzer

**Use Case:** Identify training needs and recommend courses.

```typescript
// server/api/ai/skill-analysis.post.ts
export default defineEventHandler(async (event) => {
  const { employeeId } = await readBody(event)
  
  const employee = await getEmployeeWithSkills(employeeId)
  const positionRequirements = await getPositionSkillRequirements(employee.position_id)
  const careerPath = await getCareerPathSkills(employee.career_goal_id)
  const availableCourses = await getCatalogCourses()
  
  const prompt = `
    Analyze this employee's skill profile and provide development recommendations.
    
    CURRENT SKILLS: ${JSON.stringify(employee.skills)}
    POSITION REQUIREMENTS: ${JSON.stringify(positionRequirements)}
    CAREER GOAL SKILLS: ${JSON.stringify(careerPath)}
    AVAILABLE TRAINING: ${JSON.stringify(availableCourses)}
    
    Provide:
    1. Gap analysis - skills needed for current role
    2. Growth opportunities - skills for career advancement
    3. Recommended courses (prioritized)
    4. Estimated time to close critical gaps
    
    Return as JSON with actionable recommendations.
  `
  
  // ... similar OpenAI call
})
```

### 4.3 Priority 3: Intelligent Document Processing

**Use Case:** Auto-extract data from uploaded documents (resumes, certifications, etc.)

```typescript
// server/api/ai/parse-document.post.ts
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData.find(f => f.name === 'file')
  
  // Convert to text (PDF/DOCX)
  const text = await extractText(file.data, file.type)
  
  const prompt = `
    Extract structured data from this document.
    
    DOCUMENT TYPE: ${file.type}
    CONTENT:
    ${text}
    
    Extract and return as JSON:
    {
      documentType: "resume" | "certification" | "license" | "transcript" | "other",
      person: { firstName, lastName, email, phone },
      experience: [{ title, company, startDate, endDate, description }],
      education: [{ institution, degree, field, graduationDate }],
      certifications: [{ name, issuer, issueDate, expirationDate, number }],
      skills: [{ name, level }]
    }
    
    If a field cannot be determined, use null.
  `
  
  // Use GPT-4 Vision for image-based documents
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(response.choices[0].message.content)
})
```

### 4.4 Priority 4: Natural Language Queries

**Use Case:** "Show me all certified dental hygienists who worked overtime last month"

```typescript
// server/api/ai/query.post.ts
export default defineEventHandler(async (event) => {
  const { question } = await readBody(event)
  
  // Get schema context
  const schema = await getDatabaseSchema()
  
  const prompt = `
    You are a SQL query generator for a veterinary hospital management system.
    
    SCHEMA:
    ${schema}
    
    USER QUESTION: "${question}"
    
    Generate a safe, read-only SQL query to answer this question.
    Only use SELECT statements. Never modify data.
    Return as JSON: { query: "SELECT ...", explanation: "..." }
  `
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })
  
  const { query, explanation } = JSON.parse(response.choices[0].message.content)
  
  // Validate query is safe (no mutations)
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    throw createError({ statusCode: 400, message: 'Only SELECT queries allowed' })
  }
  
  // Execute query
  const result = await supabase.rpc('execute_safe_query', { sql: query })
  
  return { data: result.data, explanation }
})
```

### 4.5 Priority 5: Proactive Insights Dashboard

**Use Case:** AI-generated weekly insights for managers

```typescript
// Scheduled job: every Monday at 6 AM
async function generateWeeklyInsights(managerId: string) {
  const context = await gatherManagerContext(managerId)
  
  const prompt = `
    Generate a weekly insights report for this veterinary department manager.
    
    CONTEXT:
    - Team size: ${context.teamSize}
    - Last week's metrics: ${JSON.stringify(context.metrics)}
    - Upcoming PTO: ${JSON.stringify(context.upcomingPto)}
    - Skill certifications expiring: ${JSON.stringify(context.expiringCerts)}
    - Open positions: ${JSON.stringify(context.openPositions)}
    - Recent performance reviews: ${JSON.stringify(context.recentReviews)}
    
    Provide:
    1. Top 3 things to celebrate this week
    2. Top 3 concerns requiring attention
    3. Specific action items with deadlines
    4. Team morale indicator (1-10) with reasoning
    
    Be specific and actionable. Reference specific employees when appropriate.
  `
  
  const insights = await generateWithOpenAI(prompt)
  
  // Store and notify
  await saveInsightsReport(managerId, insights)
  await sendNotification(managerId, 'Your weekly team insights are ready')
}
```

---

## 5. 📈 Monitoring & Observability

### 5.1 Health Check Endpoint

```typescript
// server/api/health.get.ts
export default defineEventHandler(async () => {
  const checks = {
    database: await checkDatabase(),
    cache: await checkCache(),
    slack: await checkSlackConnection(),
    storage: await checkStorageBucket()
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return {
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks
  }
})
```

### 5.2 Error Tracking Setup

Consider adding Sentry for production error tracking:

```typescript
// nuxt.config.ts addition
export default defineNuxtConfig({
  modules: ['@nuxtjs/sentry'],
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1
  }
})
```

### 5.3 Performance Monitoring

Add database query timing:

```typescript
// server/utils/queryMonitor.ts
export async function timedQuery<T>(
  name: string,
  query: () => Promise<{ data: T; error: any }>
): Promise<{ data: T; error: any; duration: number }> {
  const start = performance.now()
  const result = await query()
  const duration = performance.now() - start
  
  // Log slow queries (>500ms)
  if (duration > 500) {
    console.warn(`[SLOW QUERY] ${name}: ${duration.toFixed(2)}ms`)
  }
  
  return { ...result, duration }
}
```

---

## 6. 📋 Implementation Priority Matrix

| Initiative | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| Database constraints | High | Low | 🔴 Do First |
| Realtime cache invalidation | High | Medium | 🔴 Do First |
| Health check endpoint | Medium | Low | 🟡 Do Soon |
| Smart scheduling AI | Very High | High | 🟡 Do Soon |
| Document parsing AI | High | Medium | 🟡 Do Soon |
| Connection state manager | Medium | Low | 🟢 Nice to Have |
| Natural language queries | Medium | High | 🟢 Nice to Have |
| Weekly insights AI | Medium | Medium | 🟢 Nice to Have |

---

## 7. 🚀 Next Steps

### Immediate (This Week)
1. [ ] Create migration for database constraints
2. [ ] Add database health check function
3. [ ] Implement health check API endpoint
4. [ ] Test realtime subscriptions for cache invalidation

### Short-term (This Month)
1. [ ] Build smart scheduling assistant MVP
2. [ ] Implement document parsing for resumes
3. [ ] Add Sentry or similar error tracking
4. [ ] Create performance monitoring dashboard

### Long-term (This Quarter)
1. [ ] Natural language query interface
2. [ ] Proactive insights system
3. [ ] Predictive staffing recommendations
4. [ ] Automated compliance alerts

---

## Summary

Your system has good bones. The main gaps are:

1. **Data Integrity** - Add database-level constraints to prevent corruption
2. **Cache Synchronization** - Use realtime subscriptions for multi-user consistency
3. **Observability** - You need visibility into errors and performance
4. **AI Leverage** - The OpenAI keys are configured but unused - huge opportunity

The AI integrations represent the biggest value unlock. Smart scheduling alone could save hours of manager time weekly, and document parsing can dramatically speed up recruiting workflows.

Would you like me to implement any of these improvements now?
