# Employee GM (Green Dog Dental Edition)

## Project Vision

We are building a veterinary hospital management system ("Madden for Vets") for Green Dog Dental.
Stack: Nuxt 3, Vuetify, Pinia, Supabase (PostgreSQL + Auth).

---

## 🚨 DEVELOPMENT STANDARDS (READ BEFORE ANY CHANGE)

### Role: Full-Stack Expert

You are operating as a **Senior Architect, Developer, UI/UX Expert, and Debugger** simultaneously. Before writing ANY code:

1. **UNDERSTAND** the full context - read related files, check schema, trace data flow
2. **PLAN** the complete solution - consider all edge cases, race conditions, error states
3. **VERIFY** compatibility - check Nuxt 3 patterns, Supabase client access, Vue 3 Composition API
4. **TEST** mentally - trace the code path from user action to database and back
5. **VALIDATE** after changes - ensure no regressions, check for TypeScript errors

### Critical Nuxt 3 + Supabase Patterns

#### ❌ NEVER DO:
```typescript
// WRONG: Composables inside Pinia actions
async fetchData() {
  const supabase = useSupabaseClient() // FAILS - composable outside setup
  const user = useSupabaseUser() // FAILS - ref may be undefined
}
```

#### ✅ ALWAYS DO:
```typescript
// CORRECT: Access via nuxtApp in Pinia (note: .client property!)
const getSupabase = () => (useNuxtApp().$supabase as any)?.client

// CORRECT: Get session directly, not via composable ref
const { data: { session } } = await supabase.auth.getSession()
const userId = session?.user?.id // Always defined if session exists
```

#### Plugin Ordering (Critical!):
```typescript
// @nuxtjs/supabase uses enforce: "pre" and provides { client }
// Any plugin that needs supabase MUST declare dependency:
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['supabase'],  // Ensures supabase plugin runs first!
  async setup(nuxtApp) {
    const supabase = (nuxtApp.$supabase as any)?.client
    // Now safe to use...
  }
})
```

### Database Access Patterns

#### Profile Lookup:
```typescript
// profiles.auth_user_id links to auth.users.id (NOT profiles.id)
.eq('auth_user_id', userId)  // ✅ Correct
.eq('id', userId)            // ❌ Wrong - different UUIDs
```

#### Employee Query with Relations:
```typescript
.from('employees')
.select(`
  id, first_name, last_name, email_work, hire_date,
  profiles:profile_id ( id, avatar_url, role ),
  job_positions:position_id ( id, title ),
  departments:department_id ( id, name ),
  employee_skills ( skill_id, level, is_goal, skill_library ( name, category ))
`)
```

### State Management

#### Global Data Layer: `useAppData()`
- Uses `useState()` for SSR-safe singleton state
- Fetches employees, skills, departments, positions, locations
- Provides `currentUserProfile` and `isAdmin` for identity
- Call `fetchGlobalData()` on app mount

#### Auth Store Pattern:
```typescript
// Access Supabase safely in Pinia:
const getSupabase = () => useNuxtApp().$supabase

// Fetch profile with explicit userId (not composable ref):
async fetchProfile(userId: string) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single()
}
```

### UI/UX Standards

#### Personalization:
- Use first name everywhere: "Good morning, Marc!"
- Show role badge in sidebar: "⭐ Admin" or "Team Member"
- Tailor page titles: "Marc's Stats", "Marc's Training"

#### Tailwind Classes (Primary UI):
- Use Tailwind for new components
- Vuetify for complex components (dialogs, data tables)
- Never mix inline styles with Tailwind

#### Admin vs User Views:
```vue
<template v-if="isAdmin">
  <!-- Admin-only content -->
</template>
```

### Pre-Flight Checklist (Before Every Change)

- [ ] Did I read the relevant store/composable code?
- [ ] Did I check the database schema for correct column names?
- [ ] Did I verify Supabase client access pattern (nuxtApp.$supabase)?
- [ ] Did I handle loading, error, and empty states?
- [ ] Did I use the correct foreign key relationship?
- [ ] Will this work on first page load (no race conditions)?
- [ ] Did I add console.log for debugging if complex?

### Debugging Protocol

When something doesn't work:
1. **Check console** for errors (network, JS, Vue warnings)
2. **Trace the data flow** - where does it break?
3. **Verify Supabase** - run the query in SQL Editor
4. **Check timing** - is data ready when component renders?
5. **Validate schema** - are column names correct?

---

### Design Philosophy

- **"card" employee profile** as the central hub (portrait at top, stats below).
- **Skill ratings 0-5** (0 = Learner, 5 = Mentor).
- **Mentorship automation**: Match learners to mentors automatically.
- **Two roles only**: "admin" and "user".
- Marketing module is **admin-only**.
- Mobile-first, touch-friendly.

## Tech Stack

| Layer        | Tool              | Notes                                  |
| ------------ | ----------------- | -------------------------------------- |
| Framework    | Nuxt 3            | TypeScript strict, SSR off for SPA     |
| UI           | Vuetify 3         | Material theme, responsive             |
| State        | Pinia             | Per-domain stores                      |
| Backend      | Supabase          | Postgres + RLS + Auth + Edge Functions |
| Hosting      | Vercel            | Preview & Production                   |

## Architecture Rules

1. **Supabase Auth only** – Email/password, no social logins.
2. **`users` is reserved** – Profile data lives in `profiles` or `employees`.
3. **`role` column** on `profiles`: enum `admin`, `user`. Admin sees Marketing module.
4. **Row-Level Security** on every table – policies reference `auth.uid()` and `role`.
5. **Foreign keys** from `profiles.id` → `auth.users.id` with `on delete cascade`.
6. **Seed in migration files**, not via Nuxt code.

## Folder Layout

```
/
├─ AGENT.md               ← This file
├─ nuxt.config.ts
├─ .env                   ← Supabase creds (gitignored)
├─ app/
│   ├─ assets/css/
│   ├─ components/
│   ├─ layouts/
│   ├─ middleware/
│   ├─ pages/
│   ├─ plugins/
│   ├─ stores/
│   └─ types/
├─ public/
└─ supabase/
    ├─ migrations/
    │   ├─ 01_schema_security.sql
    │   ├─ 02_seed_org.sql
    │   └─ 03_seed_skills.sql
    └─ seed.sql
```

## Database Schema Overview

### Core Tables (60 total)

**Authentication & Users:**
- `profiles` - User profiles linked to auth.users
- `roles` - Role definitions (Super Admin, Admin, Manager, Employee)

**Organization:**
- `locations` - Hospital locations (Sherman Oaks, Venice, The Valley)
- `departments` - 24 departments across locations
- `job_positions` - 50+ job positions

**Employees:**
- `employees` - Employee records with profile links
- `employee_departments` - Department assignments
- `employee_positions` - Position assignments
- `employee_locations` - Location assignments

**Skills:**
- `skill_categories` - Skill groupings
- `skill_library` - 250+ skills with descriptions
- `user_skills` - Employee skill ratings (0-5)
- `mentorships` - Learner-Mentor relationships

**Scheduling:**
- `schedules` - Work schedules
- `shifts` - Shift definitions
- `time_off_requests` - PTO requests
- `time_off_types` - Leave types

**Training:**
- `training_modules` - Training content
- `training_progress` - Employee progress
- `certifications` - Required certifications
- `employee_certifications` - Certification tracking

**Marketing (Admin Only):**
- `leads` - Sales leads
- `lead_sources` - Lead origin tracking
- `referral_partners` - Partner relationships
- `campaigns` - Marketing campaigns
- `campaign_leads` - Campaign-lead associations

**Gamification:**
- `achievements` - Achievement definitions
- `employee_achievements` - Earned achievements
- `leaderboards` - Ranking systems


## Key Features

### Profile
- Portrait photo at top
- Key stats displayed prominently
- Skills visualization with 0-5 ratings
- Achievement badges
- Quick actions

### Skill System
- **0** = Learner (needs mentorship)
- **1** = Beginner (basic understanding)
- **2** = Intermediate (can work independently)
- **3** = Proficient (consistent quality)
- **4** = Expert (advanced knowledge)
- **5** = Mentor (can teach others)

### Mentorship Matching
- Automatic pairing of Learners (0) with Mentors (5)
- Same skill, same or nearby location preferred
- Dashboard for mentors to track mentees

### Access Control
- **Admin**: Full access to all features including Marketing
- **User**: Access to own profile, team schedules, skills, training

## Environment Variables

```env
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
VERCEL_PROJECT_ID=your-vercel-project-id
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy
