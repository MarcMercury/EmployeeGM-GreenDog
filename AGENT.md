# Employee GM (Green Dog Dental Edition)

> **🤖 AI CONTEXT FILE:** This is the primary reference document for AI assistants.
> Read this file first before making any changes.

---

# ⛔ ABSOLUTE RULE — DO NOT SKIP ⛔

## THIS IS NON-NEGOTIABLE. EXECUTE BEFORE EVERY REQUEST.

**Before responding to ANY user request, you MUST review these files IN ORDER:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Read AGENT.md (this file) - Primary context & directives  │
│  STEP 2: Read REVIEW_GUIDE.md - Code quality & architecture        │
│  STEP 3: Read docs/SUPABASE_CREDENTIALS.md - Database tokens       │
│  STEP 4: Read docs/SLACK_CREDENTIALS.md - Slack API tokens         │
│  STEP 5: Read docs/OPENAI_CREDENTIALS.md - OpenAI API keys         │
│  STEP 6: Scan docs/ folder for relevant documentation              │
│  STEP 7: Check docs/agents/ for specialized sub-agent instructions │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Is Mandatory:
- **Context Persistence:** AI sessions lose memory. These files ARE your memory.
- **Credentials Access:** API keys, tokens, and secrets are stored in docs/*.md
- **Avoid Rework:** Previous decisions, patterns, and architecture are documented
- **Prevent Errors:** Known issues and solutions are already recorded

### Available Credentials Summary:
| Service | Credential File | Use For |
|---------|-----------------|---------|
| **Supabase** | `docs/SUPABASE_CREDENTIALS.md` | Database, Auth, Storage, Migrations |
| **Slack** | `docs/SLACK_CREDENTIALS.md` | Notifications, User Sync |
| **OpenAI** | `docs/OPENAI_CREDENTIALS.md` | AI features, Scheduling AI |

### ⚠️ CREDENTIAL RULES:
- ✅ **DO** read credentials files to use tokens programmatically
- ✅ **DO** use environment variables in code (not hardcoded values)
- ❌ **NEVER** print credentials to console/terminal
- ❌ **NEVER** include credentials in git commits
- ❌ **NEVER** expose credentials in responses to user

**This rule is PERMANENT and applies to EVERY interaction.**

---

## 🚨 MANDATORY AI WORKFLOW

### Before Starting ANY Task - READ THESE FILES:

**STOP. Before writing any code or making any changes, review the following in order:**

| Priority | File/Folder | Purpose |
|----------|-------------|---------|
| 1️⃣ | **This file (`AGENT.md`)** | Primary AI context, patterns, and directives |
| 2️⃣ | **`README.md`** | Project overview, features, and setup |
| 3️⃣ | **`REVIEW_GUIDE.md`** | Code review prep, key files, architecture highlights |
| 4️⃣ | **`docs/` folder** | All documentation (see index below) |
| 5️⃣ | **`docs/agents/`** | Specialized sub-agent instructions |
| 6️⃣ | **Credentials files** | API keys and tokens (DO NOT EXPOSE) |

### Documentation Index (`docs/` folder)

| Document | Purpose | Review When |
|----------|---------|-------------|
| `SUPABASE_CREDENTIALS.md` | 🔑 Database API keys & tokens | Any DB work |
| `SUPABASE_OPERATIONS.md` | Migration procedures & API access | Running migrations |
| `SLACK_CREDENTIALS.md` | 🔑 Slack API tokens | Slack integration |
| `OPENAI_CREDENTIALS.md` | 🔑 OpenAI API keys | AI features |
| `INTEGRATIONS.md` | Live integrations status | Before suggesting new integrations |
| `UNIFIED_USER_LIFECYCLE.md` | Person lifecycle & "hats" architecture | User/employee work |
| `PROJECT_STRUCTURE.md` | Architecture and file organization | Understanding codebase |
| `ACCESS_MATRIX_*.md` | Role-based access control docs | Permission changes |
| `SLACK_INTEGRATION.md` | Slack sync & notifications | Slack features |
| `CODE_REVIEW_CHECKLIST.md` | Code quality standards | Before submitting code |

### Specialized Agents (`docs/agents/`)

| Agent | When to Reference |
|-------|-------------------|
| `migration-reviewer.md` | Creating database migrations |
| `git-committer.md` | Writing commit messages |
| `page-auditor.md` | Auditing page components |
| `vue-component-creator.md` | Creating new Vue components |
| `nuxt-pattern-checker.md` | Validating Nuxt patterns |
| `debugger.md` | Debugging issues |

### Pre-Work Checklist
- [ ] Read AGENT.md (this file) completely
- [ ] Check relevant docs/ files for the task
- [ ] Note any "Last Updated" dates on sections
- [ ] Verify credentials files exist (don't expose contents)
- [ ] Check REVIEW_GUIDE.md for code quality standards

### After Completing ANY Significant Change:
1. **UPDATE THIS FILE** if you modified:
   - Database schema (tables, columns, migrations)
   - Role/access definitions
   - Navigation or page structure
   - Key composables or stores
   - Skill system or level definitions
2. **Add "Last Updated: [Month Year]"** to changed sections
3. **COMMIT the AGENT.md update** with your other changes

### Why This Matters:
When context window resets, AI assistants lose session memory. This file is the **only persistent memory** between sessions. Outdated information here = AI reverting to old patterns.

---

## 🚨 CRITICAL: CREDENTIALS FILES

**⚠️ NEVER EXPOSE OR LOG CREDENTIALS IN CODE OR TERMINAL OUTPUT!**

| File | Contains |
|------|----------|
| `docs/SUPABASE_CREDENTIALS.md` | Database API keys, service role keys, access tokens |
| `docs/SLACK_CREDENTIALS.md` | Slack bot tokens and signing secrets |
| `docs/OPENAI_CREDENTIALS.md` | OpenAI API keys |
| `.env` | Runtime environment variables |

**Rules:**
- ✅ Read credentials files to understand what's available
- ❌ Never print credentials to console
- ❌ Never include credentials in code commits
- ❌ Never delete or modify credentials files without explicit permission

## 🚨 IMPORTANT DIRECTIVES

### 🔴 COMPREHENSIVE ERROR FIXING PROTOCOL (MANDATORY)
**DIRECTIVE:** When the user reports ANY error (visual, functional, broken link, etc.), you MUST:

1. **FIX THE REPORTED PROBLEM:**
   - Address the specific issue identified by the user
   - Do NOT assume it's a cache issue - IT IS NEVER A CACHE ISSUE
   - Verify the fix works before considering it complete

2. **AUDIT CONNECTED CODE:**
   - Identify all files, components, and systems connected to the problem
   - Check if the same issue affects related functionality
   - Fix any related issues found during the audit

3. **SEARCH FOR PATTERN ACROSS CODEBASE:**
   - The reported problem likely exists elsewhere
   - Use `grep_search` to find similar patterns throughout the codebase
   - Fix ALL instances of the problem, not just the one reported

4. **DOCUMENT WHAT WAS FIXED:**
   - List all files modified
   - Explain what the original issue was
   - Confirm all instances have been addressed

**Example:** User reports "Facilities page not found"
- ✅ Fix the broken link
- ✅ Check ALL other navigation links in both sidebar files
- ✅ Search for other broken paths in the codebase
- ✅ Verify all pages referenced actually exist
- ❌ Do NOT just fix the one link and stop

**Last Updated: January 2026**

### Auto-Push Supabase Migrations
**DIRECTIVE:** When creating SQL migrations, automatically run them against the database.
- Run `supabase db reset --local` to test locally first
- Use `supabase db push` to push to remote (requires auth token)
- If push fails due to auth, create a combined SQL file in `/scripts/` for manual execution

### 🚫 NO SHORTCUTS - Navigation & Page Link Auditing (MANDATORY)
**DIRECTIVE:** When modifying navigation, sidebar links, or moving pages, you MUST:

1. **VERIFY ALL LINKS POINT TO ACTUAL FILES:**
   - Run `find app/pages -name "*.vue" | grep -i <page-name>` to confirm page paths
   - NEVER assume a path exists - VERIFY IT EXISTS FIRST
   
2. **CHECK BOTH NAVIGATION FILES:**
   - `/app/layouts/default.vue` - Custom Tailwind sidebar (primary)
   - `/app/components/layout/AppSidebar.vue` - Vuetify sidebar (secondary)
   - Both files contain navigation - BOTH must be updated consistently
   
3. **REMOVE DUPLICATES:**
   - Same page should NOT appear in multiple sections
   - If a page logically belongs in one section, remove from others
   
4. **COMMON PAGE PATHS (Reference):**
   | Page | Correct Path | WRONG Paths |
   |------|--------------|-------------|
   | Facilities Resources | `/med-ops/facilities` | ❌ `/facilities/resources` |
   | Course Manager | `/academy/course-manager` | ❌ `/academy/courses` |
   | Export Payroll | `/export-payroll` | ❌ `/hr/payroll-export` |
   | My Skills | `/people/my-skills` | ❌ `/my-skills` |
   | Skill Stats | `/people/skill-stats` | ❌ `/skill-stats` |

5. **AUDIT CHECKLIST:**
   - [ ] All `to="/path"` links verified against actual file paths
   - [ ] No duplicate links across sections
   - [ ] Both navigation files updated identically
   - [ ] Test navigation in browser after changes

**Last Updated: January 2026**

## Project Vision

Veterinary hospital management system ("Madden for Vets") for Green Dog Dental.

**Stack:** Nuxt 3, Vuetify, Pinia, Supabase (PostgreSQL + Auth)

---

## 🏥 CALIFORNIA VETERINARY MEDICAL PRACTICE BENCHMARKS

> **MANDATORY:** All reporting, analytics, and recommendation logic MUST use the benchmarks
> defined in `app/utils/vetBenchmarks.ts`. This is the single source of truth for industry
> standards. The `useBenchmarks` composable (`app/composables/useBenchmarks.ts`) provides
> reactive evaluation functions for use in Vue components.

### Key Financial Benchmarks
| Metric | Target | Source |
|--------|--------|--------|
| Revenue per FTE DVM | $700K–$850K/year | AAHA/VHMA |
| Net Income Margin | 10–15% | AAHA Financial Pulsepoints |
| Payroll Costs | 23–25% of revenue | VHMA |
| COGS | 18–23% of revenue | AAHA |
| Facilities Expense | 7–9% of collections | AAHA |
| Exam Room Revenue | $444K+/room/year | AAHA |
| Collection Rate | ≥98% | Industry standard |

### Key Staffing Benchmarks
| Metric | Target | Source |
|--------|--------|--------|
| Staff-to-Vet Ratio | 4:1 to 5:1 | AAHA/VHMA |
| RVT-to-Vet Ratio | 2:1 | AAHA |
| CA Healthcare Min Wage | $25/hr (SB 525) | CA Labor Code |
| CA OT: Daily | >8h = 1.5×, >12h = 2× | CA § 510 |
| CA OT: Weekly | >40h = OT | CA § 510 |

### Key Client/Operational Benchmarks
| Metric | Target | Source |
|--------|--------|--------|
| New Clients | 24/month/DVM | AAHA/VetSuccess |
| Client Retention (Bonding) | 60% (18-month) | AAHA |
| Patients per Day | ~15/DVM | AVMA/VetSuccess |
| Avg Transaction Charge | $250+ | AAHA |

### CA-Specific Context (2025-2026)
- New client acquisition declining 2+ consecutive years
- Visit volume declining — retention > acquisition
- Tight staffing market due to high CA cost of living
- CA VMB: 3-year controlled substance records (stricter than federal)
- Telemedicine adoption growing post-pandemic

### Files Implementing Benchmarks
| File | What It Does |
|------|-------------|
| `app/utils/vetBenchmarks.ts` | Central benchmark constants + evaluator functions |
| `app/composables/useBenchmarks.ts` | Vue composable for reactive benchmark evaluation |
| `app/pages/marketing/sauron.vue` | Sauron executive report — uses benchmark thresholds |
| `app/pages/marketing/ezyvet-analytics.vue` | EzyVet analytics — benchmark-aware retention display |
| `server/api/marketing/ezyvet-analytics.get.ts` | Server-side analytics insights using benchmarks |
| `server/agents/handlers/referral-intelligence.ts` | AI referral agent — benchmark context in prompts |
| `server/agents/handlers/payroll-watchdog.ts` | Payroll anomaly detection using CA labor law thresholds |
| `app/utils/overtimeCalculation.ts` | CA Labor Code § 510 OT implementation |
| `app/utils/partnershipHelpers.ts` | Partner health scoring aligned with benchmarks |

**Last Updated: February 2026**

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

> **Last Updated:** January 2026

### Skill Levels (0-5 Scale)

| Level | Name | General Description |
| ----- | ---- | ------------------- |
| 0 | Untrained | Has not been trained in this skill |
| 1 | Novice | Basic awareness, needs close supervision |
| 2 | Apprentice | Can perform with guidance/oversight |
| 3 | Professional | Performs independently with consistent quality |
| 4 | Advanced | Handles complex/difficult cases, troubleshoots |
| 5 | Mentor | Can teach others, develops protocols |

### Skill Library Schema

```typescript
// skill_library table structure
{
  id: uuid,
  name: string,           // e.g., "Blood Collection (Phlebotomy)"
  category: string,       // e.g., "Clinical Skills"
  description?: string,   // Optional general description
  level_descriptions: {   // JSONB - per-skill level definitions
    "0": "Untrained.",
    "1": "Holds off vein.",
    "2": "Draws from easy veins (Cephalic).",
    "3": "Draws from all veins (Jugular, Saphenous) clean.",
    "4": "Draws from tiny/blown veins.",
    "5": "Teaches angle and technique."
  },
  is_active: boolean,     // Soft delete flag
  updated_at: timestamp
}
```

### Skill Categories (Current)
- Clinical Skills, Administrative, Anesthesia, Animal Care
- Client Service, Soft Skills, Leadership Skills, Emergency
- Surgery, Dentistry, Facilities, Imaging, Inventory
- Pharmacy, Specialty Skills, Technology, Training

### Key Skill Pages

| Page | Path | Access | Purpose |
|------|------|--------|---------|
| Skills Library | `/skills-library` | All users | Browse all skills with level descriptions |
| My Skills | `/people/my-skills` | All users | Personal skill scorecard |
| Skill Stats | `/people/skill-stats` | All users | Team skill analytics |
| Skills Management | `/admin/skills-management` | Admin only | CRUD for skill library |

### Skill Import Script
```bash
# Import skills with level descriptions (requires level_descriptions column)
npx tsx scripts/apply-skills-migration.ts
```

---

## 📅 Scheduling System

> **Last Updated:** January 2026

### Overview
The scheduling system enables AI-assisted shift scheduling with configurable services, staffing requirements, and validation rules.

### Database Tables (Phase 1 - Migration 159)

| Table | Purpose |
|-------|---------|
| `services` | Clinic services: Surgery, NAP, Dental, IM, etc. |
| `service_slots` | Recurring schedule patterns (what runs when at each location) |
| `service_staffing_requirements` | What roles each service needs (Lead DVM, Tech 1, etc.) |
| `employee_availability` | When employees can/prefer to work |
| `schedule_weeks` | Week-level status tracking (draft→review→published→locked) |
| `scheduling_rules` | Configurable constraints (max hours, rest time, etc.) |
| `ai_scheduling_log` | AI suggestion tracking and learning |

### Key Functions (Phase 2 - Migration 160)

| Function | Purpose |
|----------|---------|
| `get_services_with_requirements()` | Services + staffing requirements for builder |
| `get_employee_scheduling_context()` | Employee availability, skills, hours |
| `get_or_create_schedule_week()` | Ensures schedule_weeks record exists |
| `validate_shift_assignment()` | Check assignment against all rules |
| `generate_shifts_from_template()` | Create shifts from service_slots |
| `publish_schedule_week()` | Publish + notify employees |
| `get_schedule_week_summary()` | Coverage stats for a week |

### Schedule Builder (Phase 3)
**Updated:** The schedule builder now loads services and staffing requirements from the database instead of using hardcoded templates.

**Key Changes:**
- Rows are dynamically built from `services` + `service_staffing_requirements` tables
- Visual grouping by service with automatic break rows between services
- When creating shifts, stores `service_id` and `staffing_requirement_id` for linking
- Shift matching uses `staffing_requirement_id` (falls back to `role_required` for legacy)
- Default shift times are based on `role_category` (DVM, Lead, Tech, DA, Intern, Admin, Float)

**Data Flow:**
1. `loadServicesAndRequirements()` - Fetches services and staffing requirements
2. `buildShiftRows()` - Transforms into grid rows with break separators
3. `onDrop()` - Creates shift with `service_id` and `staffing_requirement_id`

### Shift Validation (Phase 4)
**Added:** Real-time validation when assigning shifts in the schedule builder.

**Composable:** `useScheduleValidation` (`app/composables/useScheduleValidation.ts`)

**Validation Checks:**
- `max_hours_per_week` - Blocks if exceeding 40 hours, warns at 35
- `max_hours_per_day` - Warns if single shift > 10 hours
- `min_rest_between_shifts` - Blocks if < 8 hours rest since last shift
- `max_consecutive_days` - Warns if > 6 consecutive days
- `overtime_threshold` - Shows info message when entering overtime
- Time off conflicts - Blocks if approved, warns if pending

**Roster Enhancements:**
- Shows weekly hours for each employee
- Color-coded hours: green (< 35), yellow (35-40), red (> 40)
- Visual highlighting of overtime/near-overtime employees
- Shift count badge color matches hour status

**Validation Flow:**
1. User drops employee on cell
2. `validateShiftAssignment()` RPC called
3. Violations displayed via toast
4. Error-level violations block assignment
5. Warning-level violations allow assignment with notification

### Schedule Publishing (Phase 5A)
**Added:** Publish workflow to lock schedules and notify employees.

**Features:**
- Tracks `schedule_week_id` for each week (auto-creates via `get_or_create_schedule_week()`)
- "Publish" button calls `publish_schedule_week()` RPC
- Week status display in header (draft → published → locked)
- Published week banner warns about changes to locked schedules
- Slack notification to #schedule channel on publish
- In-app notifications to all employees with shifts

**Publish Flow:**
1. Manager builds schedule (draft status)
2. Clicks "Publish Week" button
3. Confirmation dialog with Slack toggle
4. RPC updates `schedule_weeks.status = 'published'`
5. All shifts marked `is_published = true`
6. In-app notifications created for employees
7. Optional Slack message to #schedule channel

**UI Changes:**
- Week status chip in header (DRAFT/PUBLISHED/LOCKED)
- Published date display when week is published
- Warning banner when viewing published week
- Publish button hidden for already-published weeks

### Admin Pages

| Page | Path | Purpose |
|------|------|---------|
| Services | `/admin/services` | CRUD services + staffing requirements |
| Scheduling Rules | `/admin/scheduling-rules` | Configure constraints |
| Schedule Builder | `/schedule/builder` | Build weekly schedules (database-driven) |

### Scheduling Rules Types

| Rule Type | Description |
|-----------|-------------|
| `max_hours_per_week` | Limit total weekly hours (default: 40) |
| `max_hours_per_day` | Limit single shift length (default: 10) |
| `min_rest_between_shifts` | Required rest period (default: 8 hours) |
| `max_consecutive_days` | Prevent burnout (default: 6 days) |
| `overtime_threshold` | Flag overtime (default: 40 hours) |
| `break_requirement` | Required breaks for long shifts |
| `skill_required` | Require specific skill for assignment |

### Template Schedules (Phase 5B)
**Added:** Save and apply reusable schedule templates.

**Tables:**
- `schedule_templates` - Template metadata (name, description, location)
- `schedule_template_shifts` - Shift patterns within a template

**RPC Functions:**
- `save_week_as_template(name, description, week_start, location_id)` - Save current week
- `apply_template_to_week(template_id, week_start, clear_existing)` - Apply to target week
- `get_schedule_templates()` - List templates with shift counts

**UI Features:**
- Templates dropdown menu in header
- "Save Week as Template" dialog with name/description
- "Apply Template" dialog with template list and clear option
- Delete template functionality

**Usage:**
1. Build a schedule manually
2. Click Templates → Save Week as Template
3. Navigate to a new week
4. Click Templates → Apply Template
5. Select template and optionally clear existing drafts
6. Template creates shift slots (without employee assignments)

### AI Schedule Suggestions (Phase 5C)
**Added:** OpenAI-powered shift suggestions based on employee availability, skills, and scheduling rules.

**API Endpoint:**
- `/api/ai/schedule-suggest.post.ts` - OpenAI GPT-4 integration for smart scheduling

**Features:**
- "AI Suggest" button (purple) in schedule builder header
- Considers employee availability, skills, certifications, max hours, location preferences
- Returns structured suggestions with confidence scores (0-100%)
- Shows AI reasoning for each suggestion
- Batch select/deselect suggestions before applying
- Applied shifts marked with `assignment_source: 'ai_suggested'`

**AI Response Structure:**
```typescript
interface AISuggestionResult {
  shifts: AISuggestedShift[]
  coverage: { role: string; needed: number; filled: number }[]
  warnings: string[]
  summary: string
}
```

**UI Components:**
- AI Suggest button with sparkle icon
- Modal dialog with loading/error/suggestions states
- Confidence tooltip on each suggestion
- Select all/deselect all controls
- Apply selected suggestions to schedule

**Usage:**
1. Navigate to schedule builder for a week
2. Click "AI Suggest" (purple button)
3. Wait for OpenAI to analyze requirements
4. Review suggestions with confidence scores
5. Select desired suggestions (or use Select All)
6. Click "Apply Selected" to add to schedule

### Time Off Request Enhancements (Phase 5D)
**Added:** Enhanced time-off request workflow with conflict detection and Slack notifications.

**Features:**
- **Shift Conflict Detection** - Automatically checks for scheduled shifts during requested dates
- **Conflict Warning UI** - Shows count and details of conflicting shifts in request dialog
- **Slack Notifications on Submit** - Notifies #time-off-requests channel with employee, dates, and conflict info
- **Slack Notifications on Review** - DM to employee when approved/denied, plus channel update
- **Schedule Integration** - Schedule builder shows time-off conflicts when assigning employees

**UI Enhancements (my-schedule.vue):**
- Warning alert when conflicts detected (shows shift count and times)
- Loading indicator while checking conflicts
- Automatic conflict check when dates change

**Slack Message Formats:**
- Submit: Posts to #time-off-requests with employee name, type, dates, reason, and conflict warning
- Approve/Deny: DMs employee and posts status update to channel

**Pages:**
- `/my-schedule` - Employee requests time off (Time Off tab)
- `/time-off` - Admin approves/denies requests

### Shifts Table Enhancements
Added columns to `shifts` table:
- `service_id` - Links to services table
- `service_slot_id` - Links to recurring pattern
- `staffing_requirement_id` - Which role slot this fills
- `schedule_week_id` - Links to week record
- `ai_suggested` - Was this AI-recommended
- `ai_confidence` - AI confidence score (0-1)
- `ai_reasoning` - Why AI suggested this
- `assignment_source` - 'manual', 'ai_suggested', 'ai_auto', 'template', 'swap'

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

> **Last Updated:** January 2026

### System Overview
The system uses a **role-based access matrix** where each user role has specific access levels (full/view/none) to pages/sections.

**Key Tables:**
- `profiles.role` - User's role (one of 8 defined roles)
- `role_definitions` - Role metadata (tier, display name, permissions JSON)
- `page_definitions` - All navigable pages with sections
- `page_access` - Matrix of (role, page, access_level)

### User Roles (By Tier)

| Tier | Role Key | Display Name | Use Case |
|------|----------|--------------|----------|
| 200 | `super_admin` | Super Admin | Full system + user management |
| 100 | `admin` | Admin | Full system except user mgmt |
| 80 | `manager` | Manager | HR + Marketing + Ops (no admin) |
| 60 | `hr_admin` | HR Admin | HR + Recruiting + Education |
| 55 | `sup_admin` | Supervisor | Team lead, between HR and office |
| 50 | `office_admin` | Office Admin | Roster + Schedules + Med Ops |
| 40 | `marketing_admin` | Marketing Admin | Marketing + CRM + GDU |
| 10 | `user` | User | Personal workspace + view access |

### Role Type Definition (app/types/index.ts)
```typescript
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'hr_admin' | 'sup_admin' | 'office_admin' | 'marketing_admin' | 'user'
```

### Section Access Matrix
```typescript
// SECTION_ACCESS in app/types/index.ts
hr: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']
recruiting: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']
marketing: ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin']
crm_analytics: ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin']
education: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin']
schedules_manage: ['super_admin', 'admin', 'manager', 'sup_admin', 'office_admin']
schedules_view: [all roles]
admin: ['super_admin', 'admin']
```

### Important Files
- [`app/types/index.ts`](app/types/index.ts) - UserRole type, ROLE_HIERARCHY, SECTION_ACCESS
- [`app/composables/useAccessMatrix.ts`](app/composables/useAccessMatrix.ts) - Access matrix logic & loading
- [`app/pages/admin/users.vue`](app/pages/admin/users.vue) - User management with access matrix UI
- [`server/api/admin/access-matrix.ts`](server/api/admin/access-matrix.ts) - Backend access API

### How Access Works
```typescript
// In middleware/RBAC middleware or useAccessMatrix:

// 1. Get user's role from profiles table
const role = user.profile.role // e.g., "manager"

// 2. Check if they can access a page
const access = getAccess(pageId, role) // Returns 'full', 'view', or 'none'

// 3. super_admin ALWAYS gets 'full' access (hardcoded bypass)
if (roleKey === 'super_admin') return 'full'
```

### Troubleshooting Access Issues
**Q: How do I add a new role?**  
A: Update `UserRole` type, `ROLE_HIERARCHY`, `ROLE_DISPLAY_NAMES`, and `SECTION_ACCESS` in `app/types/index.ts`, then add to database `role_definitions` table.

**Q: Why does user XYZ have no access?**  
A: Check (1) their role in profiles table, (2) access matrix for that role+page, (3) console errors.

**Q: Can I give custom per-user access?**  
A: Currently no - only role-based. Would need new `user_access_override` table.

---

## 📝 AGENT.md Changelog

Track major updates to this file for AI context continuity.

| Date | Section | Change |
|------|---------|--------|
| Jan 2026 | Mandatory Workflow | Expanded to require reading README, REVIEW_GUIDE, docs/, docs/agents/, and all credentials files before any work |
| Jan 2026 | Credentials | Added all 3 credentials files (Supabase, Slack, OpenAI) with security rules |
| Jan 2026 | Documentation Index | Added full docs/ folder index with "Review When" guidance |
| Jan 2026 | Skill System | Updated skill levels (0-5 with Untrained→Mentor), added level_descriptions schema, added skill categories and pages |
| Jan 2026 | RBAC | Added `sup_admin` role (tier 55), updated to 8 roles total, added Section Access Matrix |
| Jan 2026 | Workflow | Added "MANDATORY AI WORKFLOW" section requiring AI to read/update AGENT.md |
| Jan 2026 | Skills Library | Added new `/skills-library` page accessible to all users |
| Jan 2026 | Scheduling System | Added Phase 1-2: services, staffing requirements, scheduling rules, helper functions |
| Jan 2026 | Scheduling System | Added Phase 3-4: database-driven builder, shift validation, employee hours tracking |
| Jan 2026 | Scheduling System | Added Phase 5A: schedule publishing with Slack notifications |
| Jan 2026 | Scheduling System | Added Phase 5B: template schedules - save and apply reusable week templates |
| Jan 2026 | Scheduling System | Added Phase 5C: AI schedule suggestions using OpenAI for smart shift filling |
| Jan 2026 | Scheduling System | Added Phase 5D: time-off request enhancements - conflict detection and Slack notifications |
| Jan 2026 | Scheduling Audit | Fixed Activity Hub shifts query (uses 'shifts' table), added notification triggers, attendance auto-population, reliability in AI |
| Jan 2026 | Error Protocol | Added COMPREHENSIVE ERROR FIXING PROTOCOL - audit connected code + search codebase for patterns |

### How to Update This File
When making significant changes:
1. Update the relevant section with accurate information
2. Add "Last Updated: [Month Year]" to the section header
3. Add a row to this changelog table
4. Commit AGENT.md with your other changes