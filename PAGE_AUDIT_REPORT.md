# Employee GM - Comprehensive Page Audit Report

**Generated:** December 11, 2025

This document provides a detailed audit of all pages in the Nuxt application, comparing the data requirements in the code against the actual database schema.

---

## Table of Contents
1. [Summary of Findings](#summary-of-findings)
2. [Database Schema Overview](#database-schema-overview)
3. [Page-by-Page Analysis](#page-by-page-analysis)
4. [Critical Issues](#critical-issues)
5. [Recommendations](#recommendations)

---

## Summary of Findings

### 🔴 Critical Issues (6)
1. **schedule.vue** - Uses non-existent `schedules` table and wrong schema
2. **time-off.vue** - Uses `profile_id` instead of `employee_id` for time_off_requests
3. **schedule.ts store** - References `schedules` table that doesn't exist
4. **Type definitions mismatch** - `database.types.ts` has types not matching actual DB schema
5. **RLS Policy Issues** - Multiple policies reference `auth.uid()` expecting `profiles.id` but `auth_user_id` is the link
6. **Training enrollment** - Code expects `difficulty_level` but DB column is nullable without default

### 🟡 Medium Issues (8)
1. Schedule/time-off pages mix `profile_id` with `employee_id` 
2. `ShiftType` enum used in code doesn't match DB constraints
3. Several components expect `is_active` column on training_courses but it's not explicitly in schema
4. Growth/leads.vue queries `marketing_leads` but uses different field names
5. Missing `bio` column on profiles table in DB (used in profile.vue)
6. Skill types reference `rating` but DB uses `level`
7. Time off request status values differ between types and DB
8. Employee detail page expects `skills` property that requires join logic

### 🟢 Working Well (12)
1. Roster pages properly use employees with joins
2. Org-chart uses composable with correct queries
3. Mentorship page correctly queries mentorships table
4. Goals and feedback pages use correct table structures
5. Training courses basic CRUD works
6. Growth module (events, leads, partners) properly migrated
7. Recruiting module has correct tables
8. Operations store properly queries shifts, time_entries, shift_changes

---

## Database Schema Overview

### Core Tables in Schema (from 006_full_schema.sql)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | id, auth_user_id, email, role, first_name, last_name, avatar_url | Links to auth.users |
| `employees` | id, profile_id, first_name, last_name, department_id, position_id, location_id, employment_status, hire_date | Central employee record |
| `departments` | id, name, code | Organization structure |
| `job_positions` | id, title, is_manager | Role definitions |
| `locations` | id, name, address, city, state, timezone | Physical locations |
| `shifts` | id, employee_id, location_id, start_at, end_at, status, is_open_shift | Individual shifts |
| `shift_templates` | id, name, location_id, weekday, start_time, end_time | Recurring shift definitions |
| `time_off_requests` | id, employee_id, time_off_type_id, start_date, end_date, status | PTO requests |
| `time_off_types` | id, name, is_paid, requires_approval | Leave categories |
| `time_entries` | id, employee_id, shift_id, clock_in_at, clock_out_at, total_hours | Worked time |
| `time_punches` | id, employee_id, punch_type, punched_at | Clock in/out records |
| `skill_library` | id, category, name, description | Master skill list |
| `employee_skills` | id, employee_id, skill_id, level, is_goal | Employee skill ratings |
| `mentorships` | id, skill_id, mentor_employee_id, mentee_employee_id, status | Mentorship relationships |
| `training_courses` | id, title, description, category, is_required_for_role | Course definitions |
| `training_enrollments` | id, employee_id, course_id, status | Course enrollment |
| `training_progress` | id, employee_id, lesson_id, progress_percent | Lesson progress |
| `goals` | id, title, owner_employee_id, status, progress_percent | OKRs/Goals |
| `feedback` | id, from_employee_id, to_employee_id, type, message | Peer feedback |
| `performance_reviews` | id, employee_id, manager_employee_id, status | Review records |
| `marketing_campaigns` | id, name, channel, status | Marketing campaigns |
| `leads` | id, first_name, last_name, email, status, campaign_id | Lead tracking |
| `referral_partners` | id, hospital_name, tier, total_referrals | Referral sources |
| `marketing_events` | id, name, event_date, status | Marketing events |
| `marketing_leads` | id, lead_name, event_id, status | Event leads |
| `candidates` | id, first_name, last_name, email, status | Job applicants |

### ⚠️ Important: `schedules` Table Does NOT Exist!
The code references a `schedules` table extensively, but **it does not exist in the schema**. The database uses:
- `shifts` - For individual scheduled shifts
- `shift_templates` - For recurring shift patterns

---

## Page-by-Page Analysis

### 1. Dashboard (index.vue)
**Route:** `/`

**Tables Referenced:**
- `employees` (via useAppData)
- `profiles` (joined)
- `departments` (joined)
- `job_positions` (joined)
- `skill_library` (joined)
- `employee_skills` (joined)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| View Team | Navigate to /roster | ✅ |
| Settings | Navigate to /settings (admin only) | ✅ |
| Stat cards | Navigate to various pages | ✅ |
| Quick links | Navigate to pages | ✅ |
| Mentor cards | Navigate to /employees/{id} | ✅ |
| Recent hires cards | Navigate to /employees/{id} | ✅ |
| Growth Hub | Navigate to /growth/leads | ✅ |

**Issues:**
- ✅ None - Page uses `useAppData` composable which correctly queries the database

---

### 2. Roster (roster/index.vue)
**Route:** `/roster`

**Tables Referenced:**
- `employees` (via useAppData)
- `profiles` (joined)
- `departments` (joined)
- `job_positions` (joined)
- `locations` (joined)
- `employee_skills` (joined)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Employee | Opens dialog, inserts to `employees` | ⚠️ Partial - Missing profile creation |
| View employee | Navigate to /employees/{id} | ✅ |
| Edit employee | Navigate to /employees/{id} | ✅ |
| Refresh | Refetch data | ✅ |
| Filter by department | Client-side filter | ✅ |
| Search | Client-side search | ✅ |
| View mode toggle | Client-side UI switch | ✅ |

**Issues:**
- 🟡 **Add Employee** creates an employee without a linked profile - may cause issues
- The form uses `email_work` which is correct for the employees table

---

### 3. Schedule (schedule.vue)
**Route:** `/schedule`

**Tables Referenced (in code):**
- `schedules` ❌ **DOES NOT EXIST**

**Store:** `useScheduleStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Schedule | Opens dialog | ❌ |
| Create Schedule | Inserts to `schedules` | ❌ |
| Update Schedule | Updates `schedules` | ❌ |
| Delete Schedule | Deletes from `schedules` | ❌ |

**Issues:**
- 🔴 **CRITICAL:** References `schedules` table which doesn't exist
- 🔴 The form uses `profile_id` but shifts table uses `employee_id`
- 🔴 Uses `shift_type` enum that doesn't exist in DB
- 🔴 Uses fields: `date`, `shift_type`, `start_time`, `end_time` - but `shifts` has: `start_at`, `end_at`, `status`

**Required Fix:** Rewrite to use `shifts` table with correct schema:
```sql
-- shifts table structure:
id, employee_id, location_id, start_at, end_at, status, is_open_shift
```

---

### 4. Schedule Builder (schedule/builder.vue - if exists)
Should use `scheduleBuilder.ts` store and `shifts` table

---

### 5. Time Off (time-off.vue)
**Route:** `/time-off`

**Tables Referenced:**
- `time_off_requests` ✅

**Store:** `useScheduleStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Request Time Off | Opens dialog | ✅ |
| Submit Request | Inserts to `time_off_requests` | ⚠️ |
| Approve | Updates status | ⚠️ |
| Deny | Updates status | ⚠️ |

**Issues:**
- 🔴 Code uses `profile_id` but DB schema uses `employee_id`
- 🟡 Status values: Code uses `'pending' | 'approved' | 'denied'` but DB allows `'pending' | 'approved' | 'denied' | 'cancelled'`
- 🔴 Missing `time_off_type_id` in form (required in DB)
- 🟡 Code shows `reviewed_at` but DB has `approved_at`

**Schema in DB:**
```sql
time_off_requests (
  employee_id UUID NOT NULL,  -- NOT profile_id
  time_off_type_id UUID NOT NULL,  -- Required
  status CHECK (status IN ('pending', 'approved', 'denied', 'cancelled'))
)
```

---

### 6. Training (training.vue)
**Route:** `/training`

**Tables Referenced:**
- `training_courses` ✅
- `training_enrollments` (referenced but not implemented)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Course | Opens create dialog | ✅ |
| Create Course | Inserts to `training_courses` | ✅ |
| Update Course | Updates `training_courses` | ✅ |
| Delete Course | Soft delete (is_active = false) | ⚠️ |
| Enroll | Not implemented | ❌ |
| Continue course | Navigate to /training/{id} | ❌ |

**Issues:**
- 🟡 `is_active` column used but not explicitly in migration
- 🔴 `difficulty_level` in code doesn't match DB - DB has no such column on training_courses (it's on types but not schema)
- 🔴 `created_by` in insert expects profile.id but should reference employee_id
- 🟡 My Enrollments section doesn't fetch data (comment in code)

---

### 7. Skills (skills.vue)
**Route:** `/skills`

**Tables Referenced:**
- `skill_library` ✅

**Store:** `useEmployeeStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Skill | Opens dialog | ✅ |
| Create Skill | Inserts to `skill_library` | ⚠️ |
| Edit Skill | Not implemented ("coming soon") | ❌ |
| Delete Skill | Not implemented ("coming soon") | ❌ |

**Issues:**
- 🟡 Edit/Delete marked as "coming soon"
- ✅ Schema matches - `skill_library` has id, category, name, description

---

### 8. Profile (profile.vue)
**Route:** `/profile`

**Tables Referenced:**
- `profiles` (via userStore)
- `employees` (via userStore)

**Store:** `useUserStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Edit Profile | Opens dialog | ✅ |
| Save Changes | Updates profile and employee | ⚠️ |

**Issues:**
- 🟡 `bio` field used but not in profiles migration (may have been added separately)
- 🟡 `preferred_name` is on employees table, not profiles
- 🟡 `phone_mobile` is on employees table, stored correctly

**Fields being saved:**
- `preferred_name` → employees table ✅
- `phone_mobile` → employees table ✅
- `bio` → profiles table ⚠️ (may not exist)
- `avatar_url` → profiles table ✅

---

### 9. Settings (settings.vue)
**Route:** `/settings`

**Tables Referenced:**
- `departments` ✅
- `company_settings` (not used in current code)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Save Company Info | Shows toast only | ⚠️ Not persisted |
| Add Department | Inserts to `departments` | ✅ |
| Edit Department | Updates `departments` | ✅ |
| Delete Department | Deletes from `departments` | ✅ |
| Dark Mode Toggle | UI Store | ✅ |
| Export Data | Not implemented | ❌ |
| Import Data | Not implemented | ❌ |
| Backup Database | Not implemented | ❌ |

**Issues:**
- 🟡 Company settings not persisted to database
- 🟡 Import/Export/Backup not implemented

---

### 10. Leads (leads.vue)
**Route:** `/leads`

**Action:** Redirects to `/growth/leads` ✅

---

### 11. Marketing (marketing.vue)
**Route:** `/marketing`

**Action:** Redirects to `/growth/events` ✅

---

### 12. Referrals (referrals.vue)
**Route:** `/referrals`

**Action:** Redirects to `/growth/partners` ✅

---

### 13. Feedback (feedback.vue)
**Route:** `/feedback`

**Tables Referenced:**
- `feedback` ✅

**Component:** `FeedbackStream.vue`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Give Feedback | Opens dialog | ✅ |
| Submit | Inserts to `feedback` | ✅ |

**Issues:**
- ✅ Schema matches - uses `from_employee_id`, `to_employee_id`, `type`, `message`, `is_public`

---

### 14. Goals (goals.vue)
**Route:** `/goals`

**Tables Referenced:**
- `goals` ✅
- `goal_updates` ✅

**Component:** `GoalTracker.vue`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| New Goal | Opens dialog | ✅ |
| Create Goal | Inserts to `goals` | ✅ |
| Update Progress | Opens modal | ✅ |
| Log Update | Inserts to `goal_updates` | ✅ |

**Issues:**
- ✅ Schema matches well

---

### 15. Mentorship (mentorship.vue)
**Route:** `/mentorship`

**Tables Referenced:**
- `mentorships` ✅
- `employee_skills` ✅
- `employees` ✅

**Store:** `useSkillEngineStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Request Mentorship | Creates mentorship request | ✅ |
| Accept Request | Updates mentorship status | ✅ |
| Decline Request | Updates mentorship status | ✅ |
| Manage Learning Goals | Navigate to /my-stats | ✅ |

**Issues:**
- ✅ Working correctly with proper schema

---

### 16. My Ops (my-ops.vue)
**Route:** `/my-ops`

**Tables Referenced:**
- `shifts` ✅
- `time_entries` ✅
- `time_punches` ✅
- `time_off_requests` ✅
- `shift_changes` ✅

**Store:** `useOperationsStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Clock In/Out | Inserts time_punch | ✅ |
| Request Swap | Opens dialog | ✅ |
| Submit Swap | Creates shift_change | ✅ |
| Request Drop | Opens dialog | ✅ |
| Submit Drop | Creates shift_change | ✅ |
| Request Time Off | Navigate to card | ✅ |

**Issues:**
- ✅ Operations store uses correct schema

---

### 17. My Stats (my-stats.vue)
**Route:** `/my-stats`

**Tables Referenced:**
- `employee_skills` ✅
- `skill_library` ✅
- `mentorships` ✅
- `employee_achievements` ✅
- `points_log` ✅

**Store:** `useSkillEngineStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Skill | Opens dialog | ✅ |
| Select & Add Skill | Inserts employee_skill | ✅ |
| Toggle Goal | Updates is_goal flag | ✅ |
| Request Mentorship | Creates mentorship | ✅ |
| Update Skill Level | Updates employee_skills | ✅ |

**Issues:**
- 🟡 Code uses `rating` in types but DB uses `level`
- ✅ Otherwise working correctly

---

### 18. Ops (ops.vue)
**Route:** `/ops`

**Tables Referenced:**
- `shifts` ✅
- `time_entries` ✅
- `time_off_requests` ✅
- `shift_changes` ✅

**Store:** `useOperationsStore`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Tab: Schedule | Shows MasterSchedule | ✅ |
| Tab: Time Sheets | Shows TimeSheetApproval | ✅ |
| Tab: Requests | Shows pending items | ✅ |
| Approve Time Off | Updates time_off_request | ✅ |
| Deny Time Off | Updates time_off_request | ✅ |
| Approve Shift Change | Updates shift_change | ✅ |
| Deny Shift Change | Updates shift_change | ✅ |

**Issues:**
- ✅ Working correctly with proper schema

---

### 19. Org Chart (org-chart.vue)
**Route:** `/org-chart`

**Tables Referenced:**
- `employees` ✅
- `profiles` (joined)
- `departments` (joined)
- `locations` (joined)

**Composable:** `useOrgChart`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Search | Client-side filter | ✅ |
| Expand All | Client-side UI | ✅ |
| Collapse All | Client-side UI | ✅ |
| Zoom controls | Client-side UI | ✅ |
| View Full Profile | Navigate to /employees/{id} | ✅ |

**Issues:**
- ✅ Working correctly

---

### 20. Reviews (reviews.vue)
**Route:** `/reviews`

**Tables Referenced:**
- `performance_reviews` ✅
- `review_cycles` ✅
- `review_responses` ✅
- `employees` (joined)

**Component:** `ReviewHub.vue`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Continue Review | Opens review form | ✅ |
| Submit Self-Review | Updates review | ✅ |
| Submit Manager Review | Updates review | ✅ |

**Issues:**
- ✅ Schema matches well

---

### 21. Growth/Leads (growth/leads.vue)
**Route:** `/growth/leads`

**Tables Referenced:**
- `marketing_leads` ✅
- `marketing_events` (for source filter)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Export CSV | Downloads leads | ⚠️ |
| Add Lead | Opens dialog | ✅ |
| Create Lead | Inserts to marketing_leads | ✅ |
| Update Status | Updates marketing_leads | ✅ |
| Edit Lead | Opens dialog | ✅ |
| Delete Lead | Deletes from marketing_leads | ✅ |

**Issues:**
- 🟡 Code uses `lead_name` which matches DB ✅
- 🟡 `event_id` matches DB ✅
- ✅ Working correctly

---

### 22. Growth/Events (growth/events.vue)
**Route:** `/growth/events`

**Tables Referenced:**
- `marketing_events` ✅
- `marketing_leads` (for count)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Create Event | Opens dialog | ✅ |
| Save Event | Inserts/updates marketing_events | ✅ |
| Add Lead (from drawer) | Opens lead dialog | ✅ |
| View event details | Opens drawer | ✅ |

**Issues:**
- ✅ Working correctly with 018_growth_module.sql tables

---

### 23. Growth/Partners (growth/partners.vue)
**Route:** `/growth/partners`

**Tables Referenced:**
- `referral_partners` ✅

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Partner | Opens dialog | ✅ |
| Create Partner | Inserts to referral_partners | ✅ |
| Log Visit | Opens details | ✅ |
| Save Notes | Updates referral_partners | ✅ |
| Delete Partner | Deletes from referral_partners | ✅ |

**Issues:**
- ✅ Working correctly with 016_referral_partners.sql

---

### 24. Recruiting/Index (recruiting/index.vue)
**Route:** `/recruiting`

**Tables Referenced:**
- `candidates` ✅
- `job_positions` (joined)
- `onboarding_checklist` (joined)

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Add Candidate | Navigate to /recruiting/candidates | ✅ |
| View Candidate | Navigate to /recruiting/candidates?id={id} | ✅ |
| View Onboarding | Navigate to /recruiting/onboarding?id={id} | ✅ |

**Issues:**
- ✅ Working correctly with 017_recruiting_module.sql

---

### 25. Employees/[id] (employees/[id].vue)
**Route:** `/employees/:id`

**Tables Referenced:**
- `employees` (via stores)
- `profiles` (joined)
- `employee_skills` (joined)
- `schedules` ❌ **DOES NOT EXIST**
- `time_off_requests`

**Buttons/Actions:**
| Button | Action | Works? |
|--------|--------|--------|
| Back to Team | Navigate back | ✅ |
| Edit Profile | Navigate to /employees/{id}/edit | ⚠️ Page may not exist |
| Deactivate/Activate | Toggle is_active | ⚠️ employees.is_active may not exist |
| Update Skill | Updates employee_skills | ✅ |
| Add Skill | Inserts employee_skill | ✅ |
| View Full Schedule | Navigate to /schedule | ✅ |
| Request Time Off | Opens dialog | ⚠️ Uses wrong fields |

**Issues:**
- 🔴 References `schedules` table for "Upcoming Schedule" section
- 🟡 Uses `ShiftType` enum that doesn't match DB
- 🟡 Time off form missing `time_off_type_id`
- 🟡 `employee.is_active` - employees table has `employment_status` not `is_active`

---

## Critical Issues

### Issue 1: Non-existent `schedules` Table
**Affected Files:**
- `app/pages/schedule.vue`
- `app/pages/employees/[id].vue`
- `app/stores/schedule.ts`

**Current Code Expects:**
```typescript
interface Schedule {
  id: string
  profile_id: string  // Wrong - should be employee_id
  date: string
  shift_type: ShiftType  // Doesn't exist in DB
  start_time: string
  end_time: string
  notes: string
}
```

**Actual DB Schema (shifts table):**
```sql
shifts (
  id UUID,
  employee_id UUID,  -- Not profile_id
  location_id UUID,
  start_at TIMESTAMPTZ,  -- Full datetime, not just time
  end_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('draft', 'published', 'completed', 'missed', 'cancelled')),
  is_open_shift BOOLEAN,
  is_published BOOLEAN
)
```

### Issue 2: Time Off Request Field Mismatch
**Affected Files:**
- `app/pages/time-off.vue`
- `app/stores/schedule.ts`

**Code Uses:**
- `profile_id` (wrong)
- Missing `time_off_type_id`

**DB Requires:**
- `employee_id` ✅
- `time_off_type_id` ✅ (Required NOT NULL)

### Issue 3: RLS Policy auth.uid() Issues
**In migrations, RLS uses:**
```sql
WHERE p.id = auth.uid()  -- Wrong
```

**Should be:**
```sql
WHERE p.auth_user_id = auth.uid()  -- Correct
```

This is because `profiles.id` is a separate UUID, not the auth user's ID.

### Issue 4: Employee vs Profile ID Confusion
Throughout the codebase, there's confusion between:
- `profile_id` - The ID from `profiles` table (linked to auth)
- `employee_id` - The ID from `employees` table (main record)

Most tables reference `employee_id`, but some code passes `profile_id`.

### Issue 5: Type Definition Mismatches
`app/types/database.types.ts` defines types that don't match actual schema:

| Type Definition | Actual DB |
|-----------------|-----------|
| `Shift.schedule_id` | No such column |
| `Shift.template_id` | No such column |
| `Shift.break_duration` | No such column |
| `TimeOffRequest.type_id` | Should be `time_off_type_id` |
| `TimeOffRequest.total_days` | Should be `duration_hours` |

### Issue 6: Skill Level vs Rating
- Types use `rating: SkillLevel`
- Database uses `level INTEGER`

Both are 0-5 scale but named differently.

---

## Recommendations

### Immediate Fixes (Priority 1)

1. **Create or migrate to proper shifts-based scheduling:**
   - Update `schedule.vue` to use `shifts` table
   - Update `scheduleStore.ts` to query/mutate `shifts`
   - Create `shifts` directly, not a separate `schedules` table

2. **Fix time-off requests:**
   - Change `profile_id` to `employee_id` in all time-off code
   - Add `time_off_type_id` field to forms
   - Preload `time_off_types` for selection

3. **Fix RLS policies:**
   ```sql
   -- Change from:
   WHERE p.id = auth.uid()
   -- To:
   WHERE p.auth_user_id = auth.uid()
   ```

### Short-term Fixes (Priority 2)

4. **Sync type definitions:**
   - Regenerate `database.types.ts` from actual schema
   - Or manually update to match `006_full_schema.sql`

5. **Standardize ID usage:**
   - Document when to use `employee_id` vs `profile_id`
   - Generally: use `employee_id` for all business logic
   - Use `profile_id` only for auth-related features

6. **Add missing columns:**
   - Add `bio` to profiles if needed
   - Add `is_active` to training_courses if needed

### Long-term Improvements (Priority 3)

7. **Implement missing features:**
   - Skill edit/delete in skills.vue
   - Training enrollment functionality
   - Data export/import in settings
   - Edit employee page (/employees/{id}/edit)

8. **Add validation:**
   - Form validation matching DB constraints
   - Client-side checks for required fields

9. **Improve error handling:**
   - Show specific error messages for DB constraint violations
   - Log RLS policy failures for debugging

---

## RLS Policy Summary

### Current Policies Check
Most policies in the migrations use patterns like:
```sql
EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
```

This is **incorrect** because `profiles.id` ≠ `auth.uid()`.

### Correct Pattern Should Be:
```sql
EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.auth_user_id = auth.uid() 
  AND p.role = 'admin'
)
```

### Tables with RLS Enabled:
- profiles ✅
- employees ✅
- shifts ✅
- time_off_requests ✅
- marketing_events ✅
- marketing_leads ✅
- referral_partners ✅
- candidates ✅
- candidate_skills ✅
- onboarding_checklist ✅

---

## Quick Reference: Page → Tables

| Page | Primary Tables |
|------|----------------|
| / (Dashboard) | employees, profiles, departments, employee_skills |
| /roster | employees, profiles, departments, job_positions |
| /schedule | ❌ schedules (should be shifts) |
| /time-off | time_off_requests, time_off_types |
| /training | training_courses, training_enrollments |
| /skills | skill_library |
| /profile | profiles, employees |
| /settings | departments |
| /feedback | feedback |
| /goals | goals, goal_updates |
| /mentorship | mentorships, employee_skills |
| /my-ops | shifts, time_entries, time_off_requests |
| /my-stats | employee_skills, mentorships, achievements |
| /ops | shifts, time_entries, time_off_requests, shift_changes |
| /org-chart | employees, profiles, departments |
| /reviews | performance_reviews, review_cycles |
| /growth/leads | marketing_leads |
| /growth/events | marketing_events |
| /growth/partners | referral_partners |
| /recruiting | candidates |
| /employees/[id] | employees, employee_skills, ❌ schedules |

---

*End of Audit Report*
