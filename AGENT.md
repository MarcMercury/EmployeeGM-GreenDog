# Employee GM (Green Dog Dental Edition)

> **🤖 AI CONTEXT FILE:** This is the primary reference document for AI assistants.
> Read this file first before making any changes.

## 🚨 CRITICAL: CREDENTIALS FILE

**⚠️ ALWAYS CHECK [`SUPABASE_CREDENTIALS.md`](SUPABASE_CREDENTIALS.md) FOR DATABASE CREDENTIALS!**
**⚠️ NEVER DELETE OR MODIFY THE CREDENTIALS FILE!**

All Supabase API keys, service role keys, and access tokens are stored there.

## 🚨 IMPORTANT DIRECTIVES

### Auto-Push Supabase Migrations
**DIRECTIVE:** When creating SQL migrations, automatically run them against the database.
- Run `supabase db reset --local` to test locally first
- Use `supabase db push` to push to remote (requires auth token)
- If push fails due to auth, create a combined SQL file in `/scripts/` for manual execution

## Project Vision

Veterinary hospital management system ("Madden for Vets") for Green Dog Dental.

**Stack:** Nuxt 3, Vuetify, Pinia, Supabase (PostgreSQL + Auth)

---

## 📚 DOCUMENTATION INDEX

All documentation is centralized in the `/docs` folder:

| Document | Purpose |
| -------- | ------- |
| [`SUPABASE_CREDENTIALS.md`](SUPABASE_CREDENTIALS.md) | **🔑 ALL SUPABASE API KEYS & TOKENS** |
| [`docs/SUPABASE_OPERATIONS.md`](docs/SUPABASE_OPERATIONS.md) | **Migration procedures & API access** |
| [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) | Live integrations (Supabase, Vercel, Slack) |
| [`docs/UNIFIED_USER_LIFECYCLE.md`](docs/UNIFIED_USER_LIFECYCLE.md) | Person lifecycle & "hats" architecture |
| [`docs/SLACK_INTEGRATION.md`](docs/SLACK_INTEGRATION.md) | Slack sync & notifications |
| [`docs/AUDIT_HISTORY.md`](docs/AUDIT_HISTORY.md) | Historical audit reports (resolved issues) |

### Claude Agents (`.claude/agents/`)

Specialized sub-agents for automated tasks:

| Agent | Purpose |
| ----- | ------- |
| `migration-reviewer.md` | Security review for migrations |
| `git-committer.md` | Commit message formatting |
| `page-auditor.md` | Page component auditing |
| `vue-component-creator.md` | Component scaffolding |
| `nuxt-pattern-checker.md` | Pattern validation |
| `debugger.md` | Debugging assistance |

---

## 🔌 INTEGRATIONS (READ FIRST!)

> **CRITICAL:** Before suggesting ANY integration setup, CHECK [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)

| Service | Status | Purpose |
| ------- | ------ | ------- |
| Supabase | ✅ LIVE | Database, Auth, RLS |
| Vercel | ✅ LIVE | Hosting & CI/CD |
| Slack | ✅ LIVE | Team Notifications |
| GitHub | ✅ LIVE | Auto-deploy to Vercel |

**DO NOT** suggest re-connecting these services. They are working.

---

## 🔑 CRITICAL PATTERNS

### Supabase Client Access

```typescript
// ❌ WRONG: Composables inside Pinia actions
async fetchData() {
  const supabase = useSupabaseClient() // FAILS
}

// ✅ CORRECT: Use module level or nuxtApp
const getSupabase = () => (useNuxtApp().$supabase as any)?.client
```

### Profile vs Employee ID

```typescript
// profiles.auth_user_id links to auth.users.id (NOT profiles.id)
.eq('auth_user_id', userId)  // ✅ Correct
.eq('id', userId)            // ❌ Wrong - different UUIDs

// Employee lookup via profile
const employee = await supabase
  .from('employees')
  .select('*')
  .eq('profile_id', profileId)
  .single()
```

### RLS Policy Pattern

```sql
-- Admin check function
public.is_admin()  -- Returns boolean, checks profiles.role = 'admin'

-- Check if user owns the record
employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.profile_id = auth.uid()
)
```

### Employee Query with Relations

```typescript
.from('employees')
.select(`
  id, first_name, last_name, email_work,
  profiles:profile_id ( id, avatar_url, role ),
  job_positions:position_id ( id, title ),
  departments:department_id ( id, name ),
  employee_skills ( skill_id, level, is_goal, skill_library ( name, category ))
`)
```

---

## 📁 Key File Locations

| Purpose | Path |
| ------- | ---- |
| AI Context | `/AGENT.md` (this file) |
| Database schema | `/supabase/migrations/001_schema.sql` |
| Auth store | `/app/stores/auth.ts` |
| Employee store | `/app/stores/employee.ts` |
| Global data | `/app/composables/useAppData.ts` |
| Lifecycle | `/app/composables/useLifecycle.ts` |
| Navigation | `/app/components/layout/Sidebar.vue` |
| Types | `/app/types/lifecycle.types.ts` |

---

## 🗃️ Database Architecture

### Unified Person Model ("One Human = One ID")

```text
unified_persons (Core Identity)
├── person_crm_data (Marketing "hat")
├── person_recruiting_data (Applicant "hat")
└── person_employee_data (Employee "hat")
```

**Key Functions:**

- `find_or_create_person(email)` - Dedupe-safe lookup
- `add_crm_hat(person_id)` - Add marketing data
- `add_recruiting_hat(person_id)` - Add applicant data
- `add_employee_hat(person_id)` - Hire as employee
- `grant_person_access(person_id)` - Create login
- `revoke_person_access(person_id)` - Disable login (preserves data)

### Core Tables

| Table | Purpose |
| ----- | ------- |
| `profiles` | Auth profiles linked to auth.users |
| `employees` | Employee records |
| `unified_persons` | Master person identity |
| `person_crm_data` | Marketing/CRM data |
| `person_recruiting_data` | Job application data |
| `person_employee_data` | Employment HR data |
| `skill_library` | 250+ skills |
| `employee_skills` | Skill ratings (0-5) |
| `shifts` | Work schedules |
| `time_off_requests` | PTO requests |

---

## 🔔 Notification System

### Triggers

| Trigger | Events |
| ------- | ------ |
| `notify_time_off_change` | INSERT → admins, UPDATE status → employee |
| `notify_employee_skill_change` | UPDATE level → employee |
| `notify_shift_published` | UPDATE is_published → employee |
| `notify_review_request` | INSERT → admins or employee |

### Categories

- `time_off`, `schedule`, `skills`, `performance`

---

## 📊 Skill System

| Level | Name | Description |
| ----- | ---- | ----------- |
| 0 | Learner | Needs mentorship |
| 1 | Beginner | Basic understanding |
| 2 | Intermediate | Can work independently |
| 3 | Proficient | Consistent quality |
| 4 | Expert | Advanced knowledge |
| 5 | Mentor | Can teach others |

---

## 🧭 Navigation Structure

### Admin-Only Pages

- `/admin/*` - System settings
- `/marketing/*` - Marketing module
- `/schedule/builder` - Schedule creation
- `/recruiting/*` - Candidate management

### All Users

- `/profile` - Own profile
- `/development` - Goals, Reviews
- `/my-schedule` - Schedule + time off
- `/people/skill-stats` - Skill statistics

---

## 🏗️ Tech Stack

| Layer | Tool |
| ----- | ---- |
| Framework | Nuxt 3 (TypeScript) |
| UI | Vuetify 3 |
| State | Pinia |
| Backend | Supabase (Postgres + RLS) |
| Hosting | Vercel |

---

## ✅ Pre-Flight Checklist

Before every change:

- [ ] Read related store/composable code
- [ ] Check database schema for correct column names
- [ ] Verify Supabase client access pattern
- [ ] Handle loading, error, and empty states
- [ ] Use correct foreign key relationships
- [ ] Test on first page load (no race conditions)

---

## 🚨 Database Migrations

**ALWAYS push migrations to Supabase immediately. Do NOT ask for permission.**

> 📖 **Full procedure:** See [`docs/SUPABASE_OPERATIONS.md`](docs/SUPABASE_OPERATIONS.md)

### Quick Reference

```bash
# Read access token
TOKEN=$(cat ~/.supabase/access-token)

# Run migration via Management API
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{query: .}' < supabase/migrations/XXX_migration.sql)"

# Check migration status
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"}' | jq .
```

> ⚠️ **Note:** `npx supabase db push` requires interactive password - use Management API instead.

---

## 💡 Tips for AI Assistants

1. **Check table schema** before writing INSERT/UPDATE queries
2. **RLS is enabled** on all tables - always add policies for new tables
3. **Use `is_admin()` function** for admin checks in policies
4. **Profile ID ≠ Employee ID** - join through `employees.profile_id`
5. **Composables in Pinia** - use at module level, not inside actions
6. **Reference docs folder** for detailed integration and architecture docs
7. **Access Matrix**: Check Migration 155 status before making role-related changes
8. **Roles are immutable** - managed via migrations, not UI (except access matrix)

---

## 🔐 Access Matrix & Role-Based Access Control (RBAC)

### System Overview
The system uses a **role-based access matrix** where each user role has specific access levels (full/view/none) to pages/sections.

**Key Tables:**
- `profiles.role` - User's role (one of 7 defined roles)
- `role_definitions` - Role metadata (tier, display name, permissions JSON)
- `page_definitions` - All navigable pages with sections
- `page_access` - Matrix of (role, page, access_level)

### User Roles (By Tier)
| Tier | Role | Access Level | Use Case |
|------|------|-------------|----------|
| 200 | super_admin | Full system + user management | System owner |
| 100 | admin | Full system except user mgmt | Administrator |
| 80 | manager | HR + Marketing + Ops (no admin) | Team lead |
| 60 | hr_admin | HR + Recruiting + Education | HR specialist |
| 50 | office_admin | Roster + Schedules + Med Ops | Operations |
| 40 | marketing_admin | Marketing + CRM + GDU | Marketing specialist |
| 10 | user | Personal workspace + view access | Team member |

### Important Files
- [`app/composables/useAccessMatrix.ts`](app/composables/useAccessMatrix.ts) - Access matrix logic & loading
- [`app/pages/admin/users.vue`](app/pages/admin/users.vue) - User management with access matrix UI
- [`server/api/admin/access-matrix.ts`](server/api/admin/access-matrix.ts) - Backend access API
- [`supabase/migrations/143_page_access_control.sql`](supabase/migrations/143_page_access_control.sql) - Original matrix (⚠️ Overridden by 144)
- [`supabase/migrations/144_update_page_definitions.sql`](supabase/migrations/144_update_page_definitions.sql) - Overrides 143 (⚠️ Creates inconsistency!)
- [`supabase/migrations/155_consolidate_access_matrix.sql`](supabase/migrations/155_consolidate_access_matrix.sql) - **FIX** (Ready to apply - consolidates both)

### ⚠️ KNOWN ISSUE: Access Matrix Inconsistency (Jan 2026)
**Status:** Under review, fix prepared in Migration 155

Migrations 143 and 144 define conflicting access matrices:
- Migration 143: Original detailed definition
- Migration 144: Simplified/modified, deleted and recreated all records
- **Result:** Permissions may not match expected documentation

**Action Required:**
1. Review [`docs/ACCESS_MATRIX_COMPREHENSIVE_REVIEW.md`](docs/ACCESS_MATRIX_COMPREHENSIVE_REVIEW.md) for complete details
2. Apply Migration 155 to consolidate and fix
3. Run audit: `scripts/audit-access-matrix.sql`
4. Test each role's permissions

### How Access Works
```typescript
// In middleware/RBAC middleware or useAccessMatrix:

// 1. Get user's role from profiles table
const role = user.profile.role // e.g., "manager"

// 2. Check if they can access a page
const access = getAccess(pageId, role) // Returns 'full', 'view', or 'none'

// 3. Act based on access level
switch(access) {
  case 'full': // Can view and edit
  case 'view': // Can only view
  case 'none':  // Blocked from access
}
```

### Troubleshooting Access Issues
**Q: How do I add a new page to the matrix?**  
A: Add to `page_definitions`, then run Migration 155 or manually insert page_access records.

**Q: Why does user XYZ have no access?**  
A: Check (1) their role in profiles table, (2) access matrix for that role+page, (3) console errors.

**Q: I see "Supervisor" role but it's not defined?**  
A: System only has 7 defined roles. "Supervisor" is legacy data - migrate to "manager" or "hr_admin".

**Q: Can I give custom per-user access?**  
A: Currently no - only role-based. Would need new `user_access_override` table.
