# Orphan Page Deletions — February 19, 2026

## Summary
7 orphan pages deleted. All were either redirect stubs (functionality already moved) or duplicates of existing pages. No unique functionality was lost.

---

## Deleted Pages

### 1. `app/pages/skills-library.vue` (15 lines) — REDIRECT STUB
- **What it did:** Redirected to `/admin/skills-management?tab=library`
- **Why safe:** Pure redirect. Destination is in the sidebar under Management.
- **Restore:** Functionality lives at `/admin/skills-management?tab=library`

### 2. `app/pages/training/index.vue` (15 lines) — REDIRECT STUB
- **What it did:** Redirected to `/academy/my-training`
- **Why safe:** Pure redirect. Destination is in the sidebar.
- **Note:** `/training/[id].vue` and `/training/quiz/[id].vue` were NOT deleted — they are actively used by academy components (Classroom, CourseCatalog).

### 3. `app/pages/med-ops/wiki.vue` (13 lines) — REDIRECT STUB
- **What it did:** Redirected to `/wiki`
- **Why safe:** Pure redirect. `/wiki` is in the sidebar and has the full Wiki with inline Facility Resources, Med Partners, Policies, etc.

### 4. `app/pages/academy/index.vue` (15 lines) — REDIRECT STUB
- **What it did:** Redirected to `/academy/catalog`
- **Why safe:** Pure redirect. No active callers.

### 5. `app/pages/people/skill-stats.vue` (15 lines) — REDIRECT STUB
- **What it did:** Redirected to `/admin/skills-management?tab=analytics`
- **Why safe:** Pure redirect. Destination is in the sidebar. No active callers.

### 6. `app/pages/people/my-skills.vue` (35 lines) — REDIRECT STUB
- **What it did:** Redirected to `/roster/{employeeId}?tab=skills` or `/profile`
- **Why safe:** Pure redirect. The Profile page (`/profile`) already has an inline "My Skills" section with level, XP, and skill list. Profile itself redirects to `/roster/{id}` on mount if the user has an employee record.
- **Callers updated:**
  - `app/pages/profile.vue` (2 links) → Changed to `/admin/skills-management?tab=library`
  - `app/pages/activity.vue` (1 link) → Changed to `/profile`

### 7. `app/pages/my-ops.vue` (373 lines) — DUPLICATE OF `/my-schedule`
- **What it did:** Personal operations dashboard with Time Clock, Upcoming Shifts, Time Off Requests, PTO stats, shift swap/drop dialogs, weekly hours.
- **Why safe:** `/my-schedule` (1276 lines, in sidebar) is a **complete superset** with all the same functionality plus:
  - Full tabbed interface (Schedule / Time Off)
  - Calendar view of shifts
  - Detailed time off request form with type selection
  - Available shifts tab
  - More detailed PTO balance breakdown
- **Components used (all still active in `/my-schedule`):**
  - `OperationsTimeClock`
  - `OperationsUpcomingShifts` (with swap/drop events)
  - `OperationsTimeOffRequestCard`
- **Backup:** Full source saved at `docs/audit-reports/deleted-my-ops-backup.vue`

---

## How to Restore if Needed

### Quick restore from git:
```bash
# Restore any single file:
git checkout HEAD~1 -- app/pages/my-ops.vue

# Restore all deleted files:
git checkout HEAD~1 -- app/pages/skills-library.vue app/pages/training/index.vue app/pages/med-ops/wiki.vue app/pages/academy/index.vue app/pages/people/skill-stats.vue app/pages/people/my-skills.vue app/pages/my-ops.vue
```

### If `/my-ops` needs to come back:
The full source is preserved at `docs/audit-reports/deleted-my-ops-backup.vue`. Copy it back:
```bash
cp docs/audit-reports/deleted-my-ops-backup.vue app/pages/my-ops.vue
```

---

## Pages NOT Deleted (reviewed but kept)

| Page | Lines | Reason Kept |
|------|-------|-------------|
| `med-ops/facilities.vue` | 1213 | Wiki has read-only view; this page has admin CRUD (add/edit/delete vendors) |
| `med-ops/calculators.vue` | 421 | Wiki links to it but doesn't embed it. Unique drug calculator tool. |
| `contact-list.vue` | 231 | Wiki links to it but doesn't embed it. Read-only employee directory for all users. |
| `marketing/list-hygiene.vue` | 1656 | Wiki links to it but doesn't embed it. Unique CSV processing tool. |
| `marketing/command-center.vue` | 355 | Aggregation dashboard. `inventory.vue` has back-link to it. |
| `growth/goals.vue` | 606 | Profile has personal goals only; this page adds team/company goal scopes. |
| `growth/partners.vue` | 1186 | Different table (`referral_partners`) than `/marketing/partnerships`. |
| `admin/api-monitoring.vue` | 283 | Unique admin error monitoring dashboard. |
| `academy/catalog.vue` | ~40 | Actively used by my-training and SkillsTab components. |
| `academy/signoffs.vue` | 346 | Manager training sign-off approvals. No equivalent elsewhere. |
| `settings.vue` | 149 | Only place to toggle dark mode. |
| `training/[id].vue` | ~200 | Actively used by academy Classroom component. |
| `training/quiz/[id].vue` | ~150 | Actively used by academy QuizEngine. |
| `academy/manager/create.vue` | ~300 | Sub-page of course-manager. |
