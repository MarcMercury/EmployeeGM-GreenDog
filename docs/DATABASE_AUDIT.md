# Database Audit Report - EmployeeGM Green Dog

## Executive Summary
After thorough analysis of all pages vs the database schema (006_full_schema.sql), several critical mismatches were found.

---

## 🔴 CRITICAL: Tables That Don't Exist (Code References Non-Existent Tables)

### 1. `schedules` table - DOES NOT EXIST
**Problem:** Code references `schedules` but DB has `shifts`

| Code Expects (`schedules`) | DB Has (`shifts`) |
|---------------------------|-------------------|
| `profile_id` | `employee_id` |
| `date` | `start_at` (TIMESTAMPTZ) |
| `shift_type` | No equivalent |
| `start_time` (TIME) | `start_at` (TIMESTAMPTZ) |
| `end_time` (TIME) | `end_at` (TIMESTAMPTZ) |
| `notes` | No notes column |

**Files Affected:**
- `app/stores/schedule.ts` - queries `schedules` table
- `app/pages/schedule.vue` - uses schedule store
- `app/types/database.types.ts` - defines Schedule type

**Solution:** Rewrite to use `shifts` table OR create `schedules` table as a separate concept

---

## 🟡 MEDIUM: Field Mismatches

### 1. Time Off Requests
**DB Table:** `time_off_requests`

| Code Uses | DB Has | Issue |
|-----------|--------|-------|
| `profile_id` | `employee_id` | Wrong FK |
| `reason` | Not in schema | Missing column |
| `reviewed_at` | `approved_at` | Wrong name |
| No type_id | `time_off_type_id` | Required FK missing |

### 2. Employees Table
- Code sometimes uses `role` but employees table has no `role` column
- Role is on `profiles` table only

### 3. Employee Skills
| Code | DB | Issue |
|------|-----|-------|
| `rating` | `level` | Wrong column name |
| 1-5 scale | 0-5 scale | Different range |

---

## 📊 Complete Table → Page Mapping

### Tables That Exist and Are Used Correctly:

| Table | Pages Using | Status |
|-------|-------------|--------|
| `profiles` | login, profile, layout | ✅ Working |
| `employees` | roster, employees, dashboard | ✅ Working |
| `departments` | roster, settings | ✅ Working |
| `job_positions` | roster, settings | ✅ Working |
| `locations` | roster, settings | ✅ Working |
| `skill_library` | skills, my-stats | ✅ Working |
| `employee_skills` | my-stats, employees | ✅ Working |
| `mentorships` | mentorship | ✅ Working |
| `training_courses` | training | ✅ Working |
| `training_enrollments` | training | ✅ Working |
| `goals` | goals | ✅ Working |
| `feedback` | feedback | ✅ Working |
| `leads` | leads | ✅ Working |
| `marketing_campaigns` | marketing | ✅ Working |
| `referral_partners` | growth/partners | ✅ Working |
| `candidates` | recruiting | ✅ Working |
| `interviews` | recruiting | ✅ Working |

### Tables That Exist But Have Issues:

| Table | Issue |
|-------|-------|
| `shifts` | Code queries non-existent `schedules` |
| `time_off_requests` | Field name mismatches |
| `time_off_types` | Not referenced in code |

### Tables Defined in Schema But Not Used:

- `roles`, `permissions`, `role_permissions`, `profile_roles`
- `geofences`, `clock_devices`
- `time_punches`, `time_entries`
- `shift_templates`, `shift_changes`
- `appointments`, `appointment_participants`
- `social_accounts`, `social_posts`, `social_post_attachments`
- `training_lessons`, `training_progress`, `training_quizzes`
- `review_cycles`, `review_templates`, `performance_reviews`
- `pay_periods`, `payroll_runs`, `employee_pay_settings`
- `announcements`, `tasks`, `employee_notes`
- `notifications`, `audit_logs`
- `certifications`, `employee_certifications`
- `achievements`, `employee_achievements`, `points_log`

---

## 🛠 Recommended Fixes

### Option A: Create Missing Tables (Quick Fix)
Create `schedules` table to match code expectations:

```sql
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'full-day', 'off')),
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Option B: Update Code to Use Existing Tables (Better)
Rewrite `schedule.ts` store to use `shifts` table with proper mapping.

### Fix for Time Off:
Update `time-off.vue` to:
1. Use `employee_id` instead of `profile_id`
2. Add `time_off_type_id` (required FK)
3. Change `reviewed_at` to `approved_at`

---

## 📝 Pages & Their Data Requirements

| Page | Route | Tables Needed |
|------|-------|---------------|
| Dashboard | `/` | employees, skill_library, shifts |
| Roster | `/roster` | employees, departments, positions, locations |
| Employee Detail | `/employees/[id]` | employees, employee_skills, skill_library |
| Schedule | `/schedule` | shifts, employees, locations |
| Schedule Builder | `/schedule/builder` | shifts, employees, locations |
| Time Off | `/time-off` | time_off_requests, time_off_types, employees |
| Skills Admin | `/skills` | skill_library, skill_categories |
| Training | `/training` | training_courses, training_enrollments |
| Goals | `/goals` | goals |
| Feedback | `/feedback` | feedback, employees |
| Mentorship | `/mentorship` | mentorships, employees, skill_library |
| My Stats | `/my-stats` | employees, employee_skills |
| My Ops | `/my-ops` | shifts, time_entries, time_off_requests |
| Ops Center | `/ops` | shifts, time_entries, employees |
| Settings | `/settings` | departments, positions, locations, company_settings |
| Marketing | `/marketing` | marketing_campaigns |
| Leads | `/leads` | leads, marketing_campaigns |
| Recruiting | `/recruiting` | candidates, interviews, job_postings |
| Referrals | `/referrals` | referral_partners |
