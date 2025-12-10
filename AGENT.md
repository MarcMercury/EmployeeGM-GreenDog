# Employee GM (Green Dog Dental Edition)

## Project Vision

We are building a veterinary hospital management system ("Madden for Vets") for Green Dog Dental.
Stack: Nuxt 3, Vuetify, Pinia, Supabase (PostgreSQL + Auth).

### Design Philosophy

- **"Baseball-card" employee profile** as the central hub (portrait at top, stats below).
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
- `points_log` - Point tracking

## Key Features

### Baseball Card Profile
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
