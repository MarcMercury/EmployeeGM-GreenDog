# TeamOS - Green Dog Dental Edition

> **Enterprise Veterinary Workforce Management Platform**
> 
> A comprehensive, production-grade HR/Operations system for veterinary practices, featuring employee lifecycle management, skills tracking, scheduling, recruiting, marketing CRM, and education program management.

[![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)](https://supabase.com)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3-1867C0?logo=vuetify)](https://vuetifyjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Database Schema](#-database-schema)
- [Module Deep Dive](#-module-deep-dive)
- [Security Model](#-security-model)
- [API Integrations](#-api-integrations)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🎯 Overview

TeamOS (formerly "Employee GM") is an enterprise workforce management platform built specifically for veterinary dental practices. Originally conceived as "Madden for Vets" - a gamified employee management system - it has evolved into a full-featured operations platform managing the complete lifecycle of people from initial contact through employment and beyond.

### Core Philosophy: "One Human = One ID"

The system implements a **Unified Person Model** where every individual (visitor, lead, student, applicant, employee, alumni) maintains a single identity throughout their entire relationship with the organization. Data flows seamlessly between lifecycle stages without duplication.

---

## ⭐ Key Features

### 👥 Human Resources
- **Employee Profiles** - Comprehensive "baseball card" view with photo, role, skills, tenure
- **Skill Tracking System** - 250+ veterinary skills with 0-5 rating scale (Learner → Mentor)
- **Performance Reviews** - Review requests, manager sign-offs, goal tracking
- **Compensation Management** - Pay rates, pay changes, payroll export integration
- **Time-Off Management** - PTO requests, approval workflow, balance tracking
- **Document Storage** - Secure employee document management

### 📅 Operations & Scheduling
- **Shift Scheduling** - Visual schedule builder with drag-and-drop
- **Multi-location Support** - Venice, Sherman Oaks, The Valley locations
- **Attendance Tracking** - Time punch integration, attendance records
- **Payroll Workbench** - Period-based payroll preparation and export

### 🎓 GDU (Green Dog University)
- **Student Program Management** - Interns, Externs, Paid Cohorts, Intensives
- **CE (Continuing Education) Events** - RACE-compliant course creation and tracking
- **Course Catalog** - Training modules with progress tracking
- **Manager Sign-offs** - Completion verification and skill advancement
- **Student Invite Wizard** - Identity resolution and onboarding

### 🔍 Recruiting Pipeline
- **Candidate Management** - Full applicant tracking from lead to hire
- **Interview Scheduling** - Multi-stage interview coordination
- **Onboarding Wizard** - Automated new hire onboarding checklist
- **Shadow Program** - Track job shadow visits

### 📣 Marketing Hub
- **Command Center** - Marketing dashboard with KPIs
- **Event Management** - Marketing events, attendees, follow-ups
- **Lead CRM** - Marketing qualified leads tracking
- **Partner Management** - Referral partners, veterinary clinics
- **Resource Library** - Marketing materials and assets
- **Influencer Tracking** - Social media influencer relationships

### 🔔 Notifications & Activity
- **Real-time Notifications** - In-app notification system
- **Activity Feed** - Company-wide activity stream
- **Slack Integration** - Bi-directional Slack sync for announcements
- **Email Notifications** - Transactional emails via Supabase

---

## 🏗️ Architecture

### Unified Person Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    unified_persons (Core DNA)                   │
│         Single identity record for every human contact          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ person_crm   │  │ person_      │  │ person_program_data  │  │
│  │ _data        │  │ recruiting   │  │ (Education Hat)      │  │
│  │ (CRM Hat)    │  │ _data        │  │                      │  │
│  │              │  │ (Recruit Hat)│  │ - Internships        │  │
│  │ - Leads      │  │              │  │ - Externships        │  │
│  │ - Events     │  │ - Candidates │  │ - Paid Cohorts       │  │
│  │ - Marketing  │  │ - Interviews │  │ - Intensives         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           person_employee_data (Employee Hat)             │  │
│  │                                                           │  │
│  │  Links to: employees, profiles, departments, positions   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Lifecycle Flow: Visitor → Lead → Student → Applicant → Hired → Employee → Alumni
```

### Application Structure

```
app/
├── components/           # 100+ Vue components
│   ├── academy/          # Training/course components
│   ├── dashboard/        # Dashboard widgets
│   ├── employee/         # Employee profile, cards
│   ├── growth/           # Marketing components
│   ├── intake/           # Public intake forms
│   ├── layout/           # App shell, sidebar, header
│   ├── operations/       # Schedule, time-off
│   ├── performance/      # Reviews, goals
│   ├── roster/           # Staff directory
│   ├── schedule/         # Scheduling UI
│   ├── skill/            # Skill badges, grids
│   └── ui/               # Shared UI components
│
├── composables/          # Vue composables
│   ├── useAppData.ts     # Global data fetching
│   ├── useDatabase.ts    # Supabase utilities
│   ├── useEmployeeData.ts # Employee queries
│   ├── useLifecycle.ts   # Person lifecycle ops
│   ├── usePermissions.ts # RBAC helpers
│   ├── useSlack.ts       # Slack API integration
│   └── useToast.ts       # Toast notifications
│
├── middleware/           # Route guards
│   ├── auth.ts           # Authentication check
│   ├── admin.ts          # Admin role check
│   ├── gdu.ts            # GDU access check
│   └── management.ts     # Manager+ access
│
├── pages/                # 50+ pages
│   ├── academy/          # Training & courses
│   ├── admin/            # System administration
│   ├── gdu/              # Education management
│   ├── marketing/        # Marketing hub
│   ├── recruiting/       # Candidate pipeline
│   ├── schedule/         # Scheduling
│   └── ...
│
├── stores/               # Pinia state management
│   ├── auth.ts           # Authentication state
│   ├── employee.ts       # Employee data
│   ├── academy.ts        # Training state
│   └── ...
│
└── types/                # TypeScript definitions
    ├── database.types.ts # Auto-generated Supabase types
    └── index.ts          # Application types
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Nuxt 3 | Full-stack Vue meta-framework |
| **UI Library** | Vuetify 3 | Material Design components |
| **State** | Pinia | Vue state management |
| **Language** | TypeScript 5 | Type safety |
| **Database** | PostgreSQL (Supabase) | Primary data store |
| **Auth** | Supabase Auth | Email/password authentication |
| **Storage** | Supabase Storage | File uploads (docs, images) |
| **Hosting** | Vercel | Edge deployment |
| **Integrations** | Slack API | Team notifications |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)

### Installation

```bash
# Clone repository
git clone https://github.com/MarcMercury/EmployeeGM-GreenDog.git
cd EmployeeGM-GreenDog

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SLACK_BOT_TOKEN=xoxb-your-bot-token (optional)
SLACK_APP_TOKEN=xapp-your-app-token (optional)
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order from `/supabase/migrations/`
3. Create your first admin user:

```sql
-- After signing up, promote to admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

---

## 🗃️ Database Schema

### Core Tables (120+ total)

| Category | Tables | Purpose |
|----------|--------|---------|
| **Identity** | `profiles`, `unified_persons` | User/person identity |
| **HR** | `employees`, `departments`, `job_positions`, `locations` | Org structure |
| **Skills** | `skill_library`, `employee_skills`, `skill_categories` | Competency tracking |
| **Scheduling** | `shifts`, `shift_templates`, `time_off_requests` | Work schedules |
| **Recruiting** | `candidates`, `interviews`, `onboarding_tasks` | Hiring pipeline |
| **Marketing** | `marketing_events`, `marketing_leads`, `referral_partners` | Growth |
| **Education** | `education_visitors`, `ce_events`, `person_program_data` | GDU |
| **Training** | `training_courses`, `training_enrollments`, `course_modules` | LMS |
| **System** | `company_settings`, `app_settings`, `notifications` | Config |

### Key Functions

```sql
-- Identity resolution
find_or_create_person(email, first_name, last_name)

-- Lifecycle management
add_crm_hat(person_id)
add_recruiting_hat(person_id)
add_program_hat(person_id, program_type)
add_employee_hat(person_id)

-- Access control
is_admin() -- Check if current user is admin
grant_person_access(person_id) -- Create login credentials
revoke_person_access(person_id) -- Disable login (preserve data)
```

---

## 📦 Module Deep Dive

### Skill System ("The Madden Logic")

Skills are rated 0-5, categorized as Learning (0-2), Competent (3-4), or Mentor (5):

| Level | Category | Description |
|-------|----------|-------------|
| 0-1 | 🟠 Learning | Needs hands-on training |
| 2 | 🟡 Developing | Growing proficiency |
| 3 | 🔵 Competent | Works independently |
| 4 | 🔵 Advanced | High proficiency |
| 5 | 🟢 Mentor | Can teach others |

### Training & Courses

- **Course Catalog** - Browsable course library
- **Enrollments** - Track course assignments and progress
- **Manager Sign-offs** - Verification of completion
- **Skill Advancement** - Automatic skill level increases on completion

### GDU Education Programs

| Program Type | Duration | Description |
|--------------|----------|-------------|
| Internship | 12 months | Paid veterinary internship |
| Externship | 2-8 weeks | Clinical rotation |
| Paid Cohort | Variable | Structured learning cohort |
| Intensive | 1-5 days | Short-term immersive training |
| Shadow | 1 day | Job shadowing |

---

## 🔐 Security Model

### Row Level Security (RLS)

Every table has RLS enabled with policies based on:
- **User role** (`admin`, `manager`, `employee`, `user`)
- **Ownership** (own profile, own records)
- **Manager hierarchy** (view direct reports)

### Key Pattern

```sql
-- Admin check (used in most policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Example policy
CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
```

### Auth Pattern

```
auth.users (Supabase Auth)
    ↓ trigger: handle_new_user()
profiles (auth_user_id = auth.uid())
    ↓ foreign key
employees (profile_id = profiles.id)
```

---

## 🔌 API Integrations

### Supabase (Active)
- Authentication (email/password)
- Database (PostgreSQL)
- Storage (file uploads)
- Real-time subscriptions

### Slack (Active)
- Bi-directional user sync
- Channel notifications
- Announcement posting
- User avatar sync

### Vercel (Active)
- Edge hosting
- CI/CD from GitHub
- Environment management

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy automatically on push

### Manual Build

```bash
npm run build
npm run preview
```

---

## 📚 Documentation

Additional documentation in `/docs`:

| Document | Purpose |
|----------|---------|
| `AGENT.md` | AI assistant context file |
| `docs/SUPABASE_OPERATIONS.md` | Database migration procedures |
| `docs/INTEGRATIONS.md` | Integration configuration |
| `docs/UNIFIED_USER_LIFECYCLE.md` | Person lifecycle architecture |
| `docs/SLACK_INTEGRATION.md` | Slack sync documentation |

---

## 🤝 Contributing

1. Read `AGENT.md` for coding patterns
2. Follow existing file structure
3. Ensure RLS policies for new tables
4. Use TypeScript strictly
5. Test on multiple screen sizes

---

## 📄 License

MIT License - Green Dog Dental

---

## 📊 Project Stats

- **122+ Database Migrations**
- **50+ Application Pages**
- **100+ Vue Components**
- **250+ Skills in Library**
- **15+ Composables**
- **10+ Pinia Stores**

---

Built with ❤️ for veterinary professionals by the Green Dog Dental team.

