# Employee GM - Project Context & Session History

> **Last Updated:** December 16, 2025
> **Purpose:** Preserve project knowledge across AI assistant sessions

---

## 🔑 CRITICAL PATTERNS (Read First!)

### Supabase Client Access in Pinia Stores
```typescript
// ✅ CORRECT: Use composable at module level (outside actions)
const supabase = useSupabaseClient()

// ✅ CORRECT: Or get from nuxtApp inside actions
const getSupabase = () => (useNuxtApp().$supabase as any)?.client
```

### Profile vs Employee ID
- `profiles.id` = UUID linked to `auth.uid()` (authentication)
- `employees.id` = UUID for employee record (business logic)
- `employees.profile_id` → links to `profiles.id`
- **NEVER** use `auth.uid()` directly to query employees - use profile_id lookup first

### RLS Policy Pattern
```sql
-- Check if user is admin
public.is_admin()  -- Returns boolean, checks profiles.role = 'admin'

-- Check if user owns the record (via employee)
employee_id IN (
    SELECT e.id FROM public.employees e
    WHERE e.profile_id = auth.uid()
)
```

---

## 📁 Key File Locations

| Purpose | Path |
|---------|------|
| Main context | `/AGENT.md` |
| This file | `/PROJECT_CONTEXT.md` |
| Database schema | `/supabase/migrations/001_schema.sql` |
| Latest migration | `/supabase/migrations/049_database_integrity_fixes.sql` |
| Auth store | `/app/stores/auth.ts` |
| Employee store | `/app/stores/employee.ts` |
| Performance store | `/app/stores/performance.ts` |
| Navigation | `/app/components/layout/Sidebar.vue` |
| Employee profile | `/app/pages/employees/[id].vue` |
| Schedule builder | `/app/pages/schedule/builder.vue` |
| Development page | `/app/pages/development.vue` (Goals, Reviews tabs) |
| Skills management | `/app/pages/admin/skills-management.vue` |
| Skill stats | `/app/pages/people/skill-stats.vue` |

---

## 🗃️ Database Tables (Key Ones)

### Core Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User authentication | `id`, `auth_user_id`, `email`, `role`, `avatar_url` |
| `employees` | Employee records | `id`, `profile_id`, `first_name`, `last_name`, `position_id` |
| `employee_skills` | Skill ratings | `employee_id`, `skill_id`, `level` (0-5), `is_goal` |
| `skill_library` | Skill definitions | `id`, `name`, `category`, `description` |
| `goals` | Employee goals | `id`, `owner_employee_id`, `title`, `status`, `progress_percent` |
| `time_off_requests` | PTO requests | `id`, `employee_id`, `status`, `start_date`, `end_date` |
| `shifts` | Schedule shifts | `id`, `employee_id`, `start_at`, `end_at`, `is_published` |
| `notifications` | User notifications | `id`, `profile_id`, `type`, `category`, `title`, `body` |

### New Tables (Migration 049)
| Table | Purpose |
|-------|---------|
| `review_requests` | Self-assessment and admin-initiated review requests |

### Table Columns Fixed (Migration 049)
| Table | Added Columns |
|-------|---------------|
| `employee_notes` | `note_type`, `is_pinned`, `updated_at` |
| `notifications` | `category`, `requires_action`, `action_url` |

---

## 🔔 Notification System

### Triggers (Migration 048)
| Trigger | Table | Events |
|---------|-------|--------|
| `notify_time_off_change` | `time_off_requests` | INSERT (→ admins), UPDATE status (→ employee) |
| `notify_employee_skill_change` | `employee_skills` | UPDATE level (→ employee) |
| `notify_shift_published` | `shifts` | UPDATE is_published (→ employee) |
| `notify_review_request` | `review_requests` | INSERT (→ admins or employee) |

### Notification Categories
- `time_off` - PTO requests
- `schedule` - Shift assignments
- `skills` - Skill updates
- `performance` - Reviews and goals

---

## 🎯 Recent Session Work (December 16, 2025)

### Completed Tasks
1. **Schedule Builder Time-Off Warnings** - Visual indicators when scheduling employees with pending/approved time off (orange/red borders, pulsing icons)

2. **Notification Triggers (048)** - Automatic notifications for time-off, skill changes, shift publishing

3. **Database Integrity Fixes (049)**:
   - Added `note_type`, `is_pinned` to `employee_notes`
   - Added RLS policies for `goals` table (fixed auth error)
   - Created `review_requests` table for self-assessment workflow
   - Added review request notification trigger

4. **Migration Fixes** - Fixed table name mismatches in migrations 034-048

5. **Skills Management Reorganization** - Moved Skill Library from People section to Admin Settings in sidebar

6. **Goal Creation Auth Fix** - Fixed performance store to use `userStore.employee?.id` instead of `authStore.user.id`

7. **Request Review Feature** - Added to My Reviews page (`/development.vue`) with topics, skills, notes, due date selection

8. **Admin-Initiated Reviews** - Added Request Review button to roster profile page (`/roster/[id].vue`) for admins to request employees complete self-assessments

### All Tasks Complete ✅
- Database integrity fixes applied (migration 049)
- Context file created and maintained
- Profile sub-page save buttons verified working
- Skills Management moved to Admin section
- Skills Stats page verified with employee lookup
- Goal creation auth error fixed
- Request Review added to My Reviews page
- Admin-initiated review requests on roster profile
- Review request notification triggers active

### Known Issues Fixed
| Issue | Root Cause | Fix |
|-------|------------|-----|
| Goal creation auth error | Missing RLS policies + wrong ID type | Migration 049 + performance store fix |
| Notes save failing | Missing `note_type`, `is_pinned` columns | Migration 049 adds columns |

---

## 🧭 Navigation Structure

### Admin-Only Pages (`isAdmin` check)
- `/admin/skills-management` - Skill Library management
- `/admin/goals` - Goal management
- `/marketing/*` - Marketing module
- `/schedule/builder` - Schedule creation
- `/recruiting/*` - Candidate management

### All Users
- `/profile` - Own profile
- `/development` - Goals, Reviews, Growth tabs
- `/people/my-skills` - Own skills
- `/my-schedule` - Combined schedule + time off
- `/people/skill-stats` - Skill statistics (view)

---

## 🔧 Common Development Tasks

### Adding a New Migration
```bash
# Create file: /supabase/migrations/050_your_feature.sql
# Apply locally:
npx supabase stop --no-backup
npx supabase start
# Push to production:
npx supabase db push
```

### Testing RLS Policies
```sql
-- In Supabase SQL Editor, impersonate a user:
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM your_table;  -- See what they can access
```

### Debugging Save Failures
1. Check browser console for Supabase errors
2. Verify RLS policies exist: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
3. Check column existence: `\d public.your_table` in psql
4. Verify GRANT permissions exist

---

## 📊 Skill System

### Skill Levels (0-5)
| Level | Name | Description |
|-------|------|-------------|
| 0 | Learner | Needs mentorship |
| 1 | Beginner | Basic understanding |
| 2 | Intermediate | Can work independently |
| 3 | Proficient | Consistent quality |
| 4 | Expert | Advanced knowledge |
| 5 | Mentor | Can teach others |

### Mentorship Matching
- Learners (level 0) auto-matched with Mentors (level 5)
- Same skill, same or nearby location preferred

---

## 🚀 Deployment Checklist

1. `git add -A && git commit -m "feat: description"`
2. `git push origin main`
3. `npx supabase db push` (for database changes)
4. Vercel auto-deploys from main branch

---

## 💡 Tips for AI Assistants

1. **Always check table schema** before writing INSERT/UPDATE queries
2. **RLS is enabled** on all tables - always add policies for new tables
3. **Use `is_admin()` function** for admin checks in policies
4. **Profile ID ≠ Employee ID** - always join through `employees.profile_id`
5. **Composables in Pinia** - use at module level, not inside actions
6. **Check existing migrations** for table structure before assuming columns exist
