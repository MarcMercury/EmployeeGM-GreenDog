# TeamOS - Green Dog Dental Edition

> **Enterprise Unified Operating System for Veterinary Hospital Networks**
> 
> A unified ERP platform consolidating 8 discrete software verticals into a single application: Talent Acquisition, HRIS, Workforce Scheduling, Learning Management, Partner CRM, Marketing Outreach, Knowledge Management, and Education Programs.

[![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)](https://supabase.com)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3-1867C0?logo=vuetify)](https://vuetifyjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [The 8 Verticals](#-the-8-verticals)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Database Schema](#-database-schema)
- [Module Deep Dive](#-module-deep-dive)
- [Security Model](#-security-model)
- [API Integrations](#-api-integrations)
- [Deployment](#-deployment)

---

## 🎯 Overview

TeamOS (formerly "Employee GM") is an **enterprise unified operating system** designed to replace multiple third-party SaaS subscriptions with a single, integrated interface. Originally conceived as "Madden for Vets" - a gamified employee management system - it has evolved into a comprehensive ERP platform managing the complete lifecycle of people, operations, training, and growth for veterinary dental practices.

### Core Philosophy: "One Human = One ID"

The system implements a **Unified Person Model** where every individual (visitor, lead, student, applicant, employee, alumni) maintains a single identity throughout their entire relationship with the organization. Data flows seamlessly between lifecycle stages without duplication.

### Functional Objective

Deliver a cohesive operating system capable of replacing multiple third-party SaaS subscriptions through a single, integrated interface with:
- Deterministic business logic (not probabilistic)
- Type-safe data validation at all boundaries
- Row-level security for data isolation
- Real-time collaboration via Supabase

---

## 🏢 The 8 Verticals

| Vertical | System Type | Core Function |
|----------|-------------|---------------|
| **1. Talent Acquisition** | ATS | End-to-end recruitment pipeline with AI resume parsing |
| **2. Human Resources** | HRIS | Employee data, compliance, compensation, documents |
| **3. Workforce Logistics** | Scheduler | Multi-location staffing with conflict resolution |
| **4. Learning Management** | LMS | 250+ skills, proficiency tracking, mentor sign-offs |
| **5. Partner Relations** | CRM | Referral clinic management with revenue analytics |
| **6. Marketing & Outreach** | Marketing | Events, leads, influencer management |
| **7. Knowledge Management** | Wiki | AI-powered medical knowledge base, SOPs |
| **8. Education Programs** | GDU | Internships, externships, cohorts, CE events |

---

## ⭐ Key Features

### 👥 Human Resources (HRIS)
- **Employee Profiles** - Comprehensive "baseball card" view with photo, role, skills, tenure
- **Skill Tracking System** - 250+ veterinary skills with 0-5 rating scale (Learner → Mentor)
- **Performance Reviews** - Review requests, manager sign-offs, goal tracking
- **Compensation Management** - Pay rates, pay changes, payroll export integration
- **Time-Off Management** - PTO requests with shift conflict detection, approval workflow
- **Document Storage** - Secure employee document management via Supabase Storage
- **Attendance Tracking** - Clock in/out with geolocation verification

### 📅 Operations & Scheduling
- **Shift Scheduling** - Visual schedule builder with drag-and-drop
- **Service Templates** - Pre-defined staffing requirements (e.g., "Surgery = 1 DVM + 2 Tech")
- **Conflict Detection** - Deterministic SQL logic prevents overlapping assignments
- **Draft State** - Stage schedule modifications before committing to live
- **AI Suggestions** - OpenAI-powered smart shift filling based on skills/availability
- **Multi-location Support** - Venice, Sherman Oaks, The Valley locations
- **Payroll Workbench** - Period-based payroll preparation and export

### 🎓 Learning Management (LMS)
- **Skill Library** - 250+ categorized clinical/administrative skills
- **Proficiency Levels** - 0-5 scale: Learner (0-2), Competent (3-4), Mentor (5)
- **Mentor Sign-offs** - RBAC restricts validation to Level 5 employees
- **Course Catalog** - Training modules with progress tracking
- **Skill Advancement** - Course completion auto-advances proficiency
- **CE Tracking** - RACE-compliant continuing education events

### 🎓 GDU (Green Dog University)
- **Program Types** - Internships, Externships, Paid Cohorts, Intensives, Shadows
- **Student Management** - Full lifecycle from inquiry to completion
- **Student Invite Wizard** - Identity resolution and unified onboarding
- **Visitor CRM** - Track educational inquiries and conversions

### 🔍 Recruiting Pipeline (ATS)
- **AI Resume Parsing** - OpenAI extracts structured data from unstructured PDFs
- **Zod Validation** - All entry methods (manual, bulk, upload) use unified schema
- **Interview Scheduling** - Multi-stage coordination
- **Onboarding Wizard** - Automated checklist for new hires
- **Shadow Program** - Track job shadow visits

### 📣 Marketing & CRM
- **Partner Management** - 500+ referral clinics with relationship tracking
- **Quintile Ranking** - Revenue-based tier segmentation via NTILE
- **Relationship Health** - Computed score (0-100) from tier + activity recency
- **Visit Logging** - Geolocation capture verifies physical presence
- **EzyVet Integration** - CSV parsing from veterinary PIMS
- **Event Management** - Marketing events, attendees, follow-ups
- **Influencer Tracking** - Social media relationship management
- **Resource Library** - Marketing materials and assets

### 📚 Knowledge Management (Wiki)
- **Medical Wiki** - AI-powered veterinary knowledge search
- **Category Browsing** - Organized by clinical topic
- **AI Assistant** - OpenAI-backed Q&A with source warnings
- **Role-Based Access** - Content visibility by department/role
- **Skill Linking** - Documentation connected to LMS skill records

### 🔔 Notifications & Activity
- **Real-time Notifications** - In-app notification system
- **Activity Feed** - Company-wide activity stream
- **Slack Integration** - Bi-directional sync for announcements
- **Email Notifications** - Transactional emails via Supabase/Resend

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
| **Framework** | Nuxt 3 | Full-stack Vue meta-framework with SSR |
| **UI Library** | Vuetify 3 | Material Design component library |
| **Styling** | Tailwind CSS | Utility-first CSS (supplementary) |
| **State** | Pinia | Vue state management with persistence |
| **Language** | TypeScript 5 | Strict type safety throughout |
| **Database** | PostgreSQL (Supabase) | Primary data store with 120+ tables |
| **Auth** | Supabase Auth | Email/password with RBAC |
| **Storage** | Supabase Storage | Secure file uploads (docs, images) |
| **Validation** | Zod | Runtime type validation at all boundaries |
| **AI** | OpenAI GPT-4 | Resume parsing, schedule suggestions, wiki Q&A |
| **Hosting** | Vercel Edge | Global CDN with auto-deploy |
| **Integrations** | Slack API | Bi-directional notifications |
| **Data Sync** | EzyVet CSV | Veterinary PIMS data ingestion |
| **Charts** | ApexCharts | Data visualization |
| **Drag & Drop** | Vue Draggable | Schedule builder interactions |

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

### Supabase (✅ Active)
- Authentication (email/password)
- Database (PostgreSQL with RLS)
- Storage (file uploads)
- Real-time subscriptions
- Edge Functions (CRON jobs)

### OpenAI (✅ Active)
- Resume parsing (GPT-4)
- Schedule suggestions
- Wiki Q&A assistant

### Slack (✅ Active)
- Bi-directional user sync
- Channel notifications
- Announcement posting
- User avatar sync
- Time-off request alerts

### EzyVet (✅ CSV Sync)
- Referral statistics import
- Contact data synchronization
- Revenue analytics

### Vercel (✅ Active)
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

| Metric | Count |
|--------|-------|
| Database Migrations | 136 |
| Database Tables | 120+ |
| Application Pages | 77 |
| Vue Components | 100+ |
| Skills in Library | 250+ |
| Composables | 19 |
| Pinia Stores | 10+ |
| Active Scripts | ~30 |
| TypeScript Coverage | 100% |
| Locations Supported | 3 |
| RBAC Roles | 5 |

---

## 🎯 Business Value

TeamOS consolidates the following typical SaaS subscriptions into one platform:

| Replaced SaaS Category | Annual Cost (Typical) |
|------------------------|----------------------|
| ATS (Workable, Greenhouse) | $5,000-15,000 |
| HRIS (BambooHR, Gusto) | $3,000-10,000 |
| Scheduling (When I Work, Deputy) | $2,000-5,000 |
| LMS (Lessonly, TalentLMS) | $3,000-8,000 |
| CRM (HubSpot, Salesforce) | $5,000-20,000 |
| Wiki (Notion, Confluence) | $1,000-3,000 |
| **Potential Annual Savings** | **$19,000-61,000** |

---

Built with ❤️ for veterinary professionals by the Green Dog Dental team.

*Last Updated: February 2026*

