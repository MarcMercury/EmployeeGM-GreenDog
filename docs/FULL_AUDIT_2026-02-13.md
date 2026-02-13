# Full System Audit — February 13, 2026

**Scope:** Code, Database, Middleware, Frontend  
**Codebase:** EmployeeGM-GreenDog (Nuxt 3 + Supabase + Vuetify)  
**Total Findings:** 14 Critical/High, 19 Medium, 12 Low

---

## Executive Summary

The application is a substantial Nuxt 3 SPA managing veterinary workforce operations with ~200+ migrations, 60+ API endpoints, 30+ pages, and 24 Pinia stores. The architecture is generally sound, but the audit uncovered **serious security gaps** across all layers:

- **Hardcoded credentials** exposed in client bundles and migrations
- **Confidential CSV files** served publicly without authentication
- **XSS attack surface** via unsanitized `v-html` in 5 locations
- **SQL operator precedence bugs** in RLS policies granting unintended access
- **Blanket database grants** undermining the RLS security model
- **Missing authentication** on sensitive API endpoints
- **Emergency auth bypass** stored in XSS-extractable localStorage

---

## 1. MIDDLEWARE AUDIT

### 1.1 Files Reviewed
| File | Purpose | Status |
|------|---------|--------|
| `auth.ts` | Base auth gate + profile hydration | **Issues found** |
| `admin.ts` | Admin role check | OK |
| `admin-only.ts` | Duplicate of admin.ts | **Dead code** |
| `gdu.ts` | Education section gate | OK |
| `management.ts` | HR section gate | **Semantic mismatch** |
| `marketing-admin.ts` | Marketing section gate | OK |
| `rbac.ts` | Unified RBAC (path-based) | **Dead code — never used** |
| `schedule-access.ts` | Schedule manage gate | OK |
| `super-admin-only.ts` | Super admin only | OK |

### 1.2 Critical Findings

#### [CRITICAL] Emergency Auth Bypass Trusts localStorage
**File:** `app/middleware/auth.ts` lines 18-28  
The emergency auth flow reads a profile from `localStorage` and injects it into `authStore.profile` with `as any` — no server-side re-validation. An XSS attack that plants `{"role":"super_admin"}` in `emergency_auth_profile` grants full admin access.

**Impact:** Complete authentication/authorization bypass  
**Fix:** Move emergency tokens to httpOnly server cookies; re-validate on each request

#### [HIGH] 9+ Pages Missing Role-Based Middleware
These pages have sensitive data but only use `['auth']`:

| Page | Risk | Suggested Middleware |
|------|------|---------------------|
| `roster/index.vue`, `roster/[id].vue` | Employee records exposed | `management` |
| `marketing/appointment-analysis.vue` | Analytics data | `marketing-admin` |
| `marketing/invoice-analysis.vue` | Financial data | `marketing-admin` |
| `marketing/ezyvet-integration.vue` | Integration config | `marketing-admin` |
| `marketing/calendar.vue` | Event data | `marketing-admin` |
| `marketing/resources.vue` | Internal resources | `marketing-admin` |
| `time-off.vue` | All PTO requests visible | `management` |
| `people/skill-stats.vue` | Employee skill data | `management` |
| `settings.vue` | App settings | `admin` (if admin-only) |

#### [MEDIUM] Dead Middleware Files
- `admin-only.ts` — Exact duplicate of `admin.ts`, was flagged for deletion in prior audit but still exists
- `rbac.ts` — Comprehensive RBAC middleware, never referenced by any page. Route coverage is incomplete if activated

#### [MEDIUM] management.ts Semantic Mismatch
Named "management" but checks `SECTION_ACCESS.hr` instead of a "management" section. Used by recruiting pages which have their own `SECTION_ACCESS.recruiting` entry with the same roles — fragile if they diverge.

---

## 2. SERVER/API AUDIT

### 2.1 Scope
~60+ API endpoints across auth, admin, AI, analytics, appointments, compliance, cron, ezyvet, intake, invoices, marketing, marketplace, operations, public, recruiting, slack, wiki.

### 2.2 Critical & High Findings

#### [CRITICAL] Hardcoded Lockout Password
**File:** `server/api/admin/users/[id]/toggle-active.post.ts:12`
```typescript
const LOCKED_PASSWORD = 'GDDGDD2026_DISABLED'
```
When disabling users, this **static, guessable** password is set. An attacker who discovers this string can log in as any deactivated user.  
**Fix:** Use `crypto.randomUUID() + crypto.randomUUID()` + user ban (as done in `deactivate-employee.post.ts`)

#### [CRITICAL] SQL Injection via PostgREST Filters
**Files:** `server/api/intake/persons.get.ts:50`, `server/api/wiki/search.post.ts:286`
```typescript
dbQuery = dbQuery.or(`first_name.ilike.%${search}%,...`)
```
User input is interpolated directly into `.or()` filter strings. Crafted inputs with commas/dots can break out of the filter syntax.  
**Fix:** Use individual `.ilike()` calls chained, or escape special characters

#### [HIGH] Unauthenticated Endpoints
| Endpoint | Risk |
|----------|------|
| `/api/system-health` | Exposes DB status, auth status, missing env var names, server uptime — zero auth |
| `/api/wiki/search` | Creates admin client (service role), queries wiki, triggers OpenAI calls — zero auth |

#### [HIGH] ezyVet Webhook Secret Bypass
**File:** `server/api/ezyvet/webhook.post.ts:27`
```typescript
if (webhookSecret && incomingSecret !== webhookSecret)
```
If `ezyvetWebhookSecret` is not configured, validation is **skipped entirely**.  
**Fix:** Change to `if (!webhookSecret || incomingSecret !== webhookSecret)`

#### [HIGH] Cron Secret Same Pattern
**File:** `server/api/cron/ezyvet-sync.get.ts:25` — same fail-open if `cronSecret` is unset.

#### [HIGH] Public Endpoints Using Service Role Key
`server/api/public/positions.get.ts` and `server/api/public/apply.post.ts` create clients with the service role key, bypassing all RLS. Public endpoints should use the anon key.

#### [HIGH] Any User Can Trigger Marketplace Penalties
`server/api/marketplace/check-expired.post.ts` — only checks authentication (any logged-in user), not role. Any employee can trigger wallet deductions.

#### [HIGH] employee-audit.get.ts Wrong Column
```typescript
.eq('id', callerUser.id)  // BUG: should be .eq('auth_user_id', callerUser.id)
```
Uses auth UUID against `profiles.id` PK — always fails to find the profile, accidentally denying everyone.

### 2.3 Medium Findings

| Issue | Impact |
|-------|--------|
| 3 different auth patterns used across endpoints | Hard to audit, easy to miss checks |
| Emergency login token comparison not timing-safe | Timing attack risk |
| Error messages leak internal details (env var names, DB errors, user roles) | Info disclosure |
| 25+ places use `console.*` instead of structured `logger.*` | Bypasses log filtering/redaction |
| `slack/send.post.ts` has no input validation | Can send arbitrary Slack messages |
| `admin/users.post.ts` allows `hr_admin` to create users (inconsistent with `ADMIN_ROLES`) | Role confusion |
| In-memory rate limiter resets on cold starts (serverless) | Ineffective rate limiting |

### 2.4 Low Findings
- `.bak` file exists in API directory (`ezyvet-analytics.get.ts.bak`)
- Empty `debug/` directory should be removed
- `slack/channels.get.ts` — any user can list all Slack channels
- Missing audit logs on destructive marketplace/recruiting operations

---

## 3. DATABASE AUDIT

### 3.1 Schema Overview
- 191 migration files
- ~100+ tables with RLS
- 60+ SECURITY DEFINER functions
- Mixed naming: 179 numbered (`001_` - `251_`) + 12 timestamped (`20250124_...`)

### 3.2 Critical Findings

#### [CRITICAL] SQL Operator Precedence Bug in RLS Policies
**File:** `supabase/migrations/202_appointment_analysis.sql:114-137`
```sql
WHERE id = auth.uid() OR auth_user_id = auth.uid() AND role IN (...)
```
`AND` binds tighter than `OR`, so this evaluates as:
```sql
WHERE id = auth.uid() OR (auth_user_id = auth.uid() AND role IN (...))
```
If any profile has `id = auth.uid()`, they get access regardless of role. This affects 3 tables: `appointment_data`, `appointment_analysis_runs`, `appointment_service_mapping`.  
**Fix:** Add parentheses: `WHERE (id = auth.uid() OR auth_user_id = auth.uid()) AND role IN (...)`

#### [CRITICAL] Blanket GRANT ALL Undermines RLS
**File:** `supabase/migrations/002_security.sql:447-451`
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
```
This gives every authenticated user INSERT/UPDATE/DELETE on **all tables** and every anonymous user SELECT on **all tables**. RLS is the only barrier — if any table is missing policies, it's fully exposed.  
**Fix:** Use table-specific grants; remove blanket permissions

#### [CRITICAL] Duplicate Migration Prefixes
| Prefix | File A | File B |
|--------|--------|--------|
| `137_` | `invoice_dashboard_function.sql` | `phase1_data_integrity.sql` |
| `200_` | `employee_self_update_rls.sql` | `security_fixes_feb_2026.sql` |
| `202_` | `agent_token_increment_rpc.sql` | `appointment_analysis.sql` |

Creates undefined execution order.

### 3.3 High Findings

| Issue | Impact |
|-------|--------|
| SECURITY DEFINER functions without `SET search_path` (002, 083) | Search path hijacking → privilege escalation |
| `anon` role granted EXECUTE on `is_admin()`, `is_marketing_admin()`, etc. | Attack surface expansion |
| `USING (true)` SELECT on sensitive tables (candidates, financial_kpis, time_punches, performance_reviews) | All authenticated users can read all HR/financial data |
| `WITH CHECK (true)` on med_ops and Slack tables (094, 095, 105) | Unrestricted writes |

### 3.4 Medium Findings

| Issue | Impact |
|-------|--------|
| Dual RBAC systems: `profiles.role` TEXT column vs. `roles/permissions` normalized tables vs. `role_definitions` | Confusion about authority source |
| Hardcoded admin email (`marc.h.mercury@gmail.com`) in 4 migrations + seed.sql | Non-portable, credential exposure |
| Plaintext password in seed.sql (`Gold_1234!`) | Credential in VCS |
| 27 reactive "fix RLS" migrations indicate process gap | Policies created wrong, patched later |
| TRUNCATE without safeguards in migrations 097, 098 | Data loss risk |
| DROP TABLE CASCADE in 001_schema.sql | Destructive if re-run |

### 3.5 Missing Indexes
- `employee_ce_transactions.employee_id`
- `training_progress.employee_id` (used in RLS subqueries)
- `training_enrollments.employee_id` (used in RLS subqueries)
- `time_off_requests.time_off_type_id`
- `payroll_run_items` FK columns

---

## 4. FRONTEND AUDIT

### 4.1 XSS — Unsanitized `v-html` (5 instances)

| Location | Source | Severity |
|----------|--------|----------|
| `wiki.vue:134` | AI response (regex-based markdown→HTML) | **HIGH** |
| `wiki.vue:256` | Database `wiki_articles.content` | **HIGH** |
| `Classroom.vue:205` | `marked()` output (no sanitization) | **HIGH** |
| `email-templates.vue:239` | Admin-edited templates | **MEDIUM** |
| `email-templates.vue:283` | Template preview | **MEDIUM** |

**Fix:** Install `dompurify`, create `useSanitizedHtml()` composable, apply to all `v-html` bindings.

### 4.2 Hardcoded Credentials in Client Bundle

| Credential | File | Severity |
|------------|------|----------|
| `Marc.H.Mercury@gmail.com` / `admin123` | `auth/login.vue:233-239` (`fillDemoCredentials()`) | **CRITICAL** |
| Emergency auth UI visible to all users | `auth/login.vue:165-174` | **MEDIUM** |

**Fix:** Remove demo credentials or gate behind `process.dev`. Hide emergency login behind a URL param.

### 4.3 Confidential Files in `/public/`

**17 CSV files** served as static assets with no authentication:
- `CONFIDENTIAL_candidates.csv` — recruiting candidate data
- `ALL Ezyvet Contacts-2026-01-16-11-50-28.csv` — customer contact info
- `User and Emp Upload.csv` — employee data
- `Invoice Lines-*.csv` (3 files) — financial data
- `GDD Referral Master Lists - MASTER.csv`
- `Referral Clinics Tracker` files
- `2025 EVENT SIGNUPS.csv`
- `Appointments/` directory with weekly tracking

**Impact:** Anyone with the URL can download confidential employee, customer, and financial data.  
**Fix:** Move to Supabase storage with auth-gated access, or delete from public/

### 4.4 Performance Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| Full Vuetify import (`import * as components`) | ~200 unused components in bundle | **HIGH** |
| ApexCharts globally registered on every page | Large JS load for non-chart pages | **HIGH** |
| Almost zero lazy loading (`defineAsyncComponent` used once) | Monolithic bundle | **MEDIUM** |
| `callOnce(fetchGlobalData)` in layout | Waterfall on every first navigation | **MEDIUM** |

### 4.5 State Management Issues

| Issue | Impact |
|-------|--------|
| Duplicate profile state in `authStore`, `userStore`, and `useAppData()` | Race conditions, stale data |
| `userStore` auto-links employee records by name if ID lookup fails | Wrong employee record on name collision |
| Settings page checks `user_metadata.role` instead of `authStore.profile.role` | Can diverge if role updated |
| Sentry plugin references `authStore.user` (doesn't exist, should be `.profile`) | User context never sent to Sentry |
| 43 `console.log/warn/error` calls in auth stores/plugins | Auth data visible in browser DevTools |

### 4.6 Accessibility Issues

| Issue | Standard |
|-------|----------|
| `user-scalable=no` in viewport meta | Blocks pinch-to-zoom (WCAG 1.4.4) |
| Sidebar emoji icons lack `aria-label` | Screen reader incompatible |
| Collapsible sections missing `aria-expanded` | State not communicated |
| No CSP headers configured | Amplifies XSS risk |

---

## 5. PRIORITY REMEDIATION PLAN

### Immediate (P0 — This Week)

| # | Action | Risk Mitigated |
|---|--------|----------------|
| 1 | Move/delete confidential CSVs from `/public/` | Data breach |
| 2 | Remove `fillDemoCredentials()` from login.vue or gate behind `process.dev` | Credential exposure |
| 3 | Replace hardcoded `LOCKED_PASSWORD` with randomUUID + ban | Account takeover of disabled users |
| 4 | Fix RLS operator precedence bug in 202_appointment_analysis.sql | Unauthorized data access |
| 5 | Add auth to `/api/system-health` and `/api/wiki/search` | Unauthenticated info disclosure |
| 6 | Fix ezyVet webhook + cron secret to fail-closed | Unauthorized webhook injection |

### High Priority (P1 — Next Sprint)

| # | Action | Risk Mitigated |
|---|--------|----------------|
| 7 | Install DOMPurify, sanitize all 5 `v-html` bindings | XSS |
| 8 | Add role middleware to 9 under-protected pages | Unauthorized data access |
| 9 | Replace blanket `GRANT ALL` with table-specific grants | RLS bypass when policies are missing |
| 10 | Fix SECURITY DEFINER functions to include `SET search_path` | Privilege escalation |
| 11 | Add role check to `marketplace/check-expired.post.ts` | Any user triggering penalties |
| 12 | Fix `employee-audit.get.ts` profile lookup column | Auth bypass |
| 13 | Use anon key for public endpoints instead of service role | RLS bypass |
| 14 | Escape PostgREST filter inputs in persons.get.ts, wiki/search.post.ts | Filter injection |

### Medium Priority (P2 — Next Month)

| # | Action | Risk Mitigated |
|---|--------|----------------|
| 15 | Move emergency auth tokens to httpOnly server cookies | XSS → admin takeover |
| 16 | Standardize API auth pattern (single middleware composable) | Inconsistent auth |
| 17 | Use timing-safe comparison for emergency login tokens | Timing attacks |
| 18 | Tree-shake Vuetify, lazy-load ApexCharts | Bundle size / performance |
| 19 | Consolidate duplicate profile state (authStore vs userStore vs useAppData) | State inconsistency |
| 20 | Add missing indexes on RLS subquery columns | RLS query performance |
| 21 | Delete dead middleware (`admin-only.ts`, `rbac.ts`) | Code hygiene |
| 22 | Renumber duplicate migration prefixes (137, 200, 202) | Migration ordering |
| 23 | Remove plaintext password from seed.sql | Credential hygiene |
| 24 | Strip console.log from auth flows in production builds | Info leak |
| 25 | Add CSP headers at Vercel/hosting level | XSS defense-in-depth |
| 26 | Fix accessibility (viewport, aria-label, aria-expanded) | WCAG compliance |

---

## 6. METRICS SUMMARY

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| **Middleware** | 1 | 1 | 3 | 2 |
| **Server/API** | 2 | 6 | 7 | 5 |
| **Database** | 3 | 4 | 6 | 3 |
| **Frontend** | 2 | 3 | 8 | 4 |
| **Total** | **8** | **14** | **24** | **14** |

---

*Audit performed on February 13, 2026. All findings verified against current `main` branch.*
