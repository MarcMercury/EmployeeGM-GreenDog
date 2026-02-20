# Code Review Preparation - Quick Reference

> **🤖 AI AGENTS:** You MUST read `AGENT.md` FIRST before this file. This file is part of the mandatory pre-work checklist. Also review `docs/` folder for credentials and integration details.

---

## 🎯 System Overview

**TeamOS** is an **enterprise unified operating system** for veterinary hospital networks - a single platform replacing 8+ discrete SaaS applications. Originally conceived as "Madden for Vets," it has evolved into a production-grade ERP system managing people, operations, training, and growth.

### The 8 Verticals

| Module | Function | Key Features |
|--------|----------|--------------|
| **1. HRIS** | Human Resources | Employee profiles, compliance, documents, compensation |
| **2. ATS** | Talent Acquisition | Recruiting pipeline, AI resume parsing, onboarding |
| **3. Scheduler** | Workforce Logistics | Multi-location shifts, conflict detection, time tracking |
| **4. LMS** | Learning Management | 250+ skills, 0-5 proficiency, mentor sign-offs, CE tracking |
| **5. CRM** | Partner Management | Referral clinic tracking, quintile ranking, health scores |
| **6. Marketing** | Growth & Outreach | Events, leads, influencer management, resource library |
| **7. Wiki** | Knowledge Base | AI-powered medical knowledge, SOPs, role-based access |
| **8. GDU** | Education Programs | Internships, externships, cohorts, intensives, shadows |

### Technical Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vue 3 + Nuxt 3 | Type-safe SSR framework |
| **UI** | Vuetify 3 + Tailwind | Material Design components |
| **State** | Pinia | Reactive state management |
| **Database** | PostgreSQL (Supabase) | Relational data with RLS |
| **Auth** | Supabase Auth | RBAC with 5 permission levels |
| **Storage** | Supabase Storage | Secure file/document storage |
| **AI** | OpenAI GPT-4 | Resume parsing, schedule suggestions |
| **Integrations** | Slack, EzyVet | Notifications, PIMS data sync |
| **Hosting** | Vercel Edge | Global CDN deployment |
| **Validation** | Zod | Runtime type safety at all boundaries |

---

## 📁 Where to Start

1. **AGENT.md** - Primary AI context (read this first)
2. **README.md** - Full project overview
3. **docs/PROJECT_STRUCTURE.md** - Architecture details
4. **docs/UNIFIED_USER_LIFECYCLE.md** - Core data model

---

## 🔍 Key Files to Review

### Best Examples of Code Quality
| File | Why It's Good |
|------|---------------|
| `app/composables/useLifecycle.ts` | Clean business logic, unified person management |
| `app/middleware/auth.ts` | Simple, effective route protection |
| `app/stores/auth.ts` | Well-structured Pinia state |
| `app/stores/operations.ts` | Complex scheduling logic, conflict detection |
| `app/schemas/candidate.ts` | Zod validation patterns |
| `app/pages/index.vue` | Dashboard implementation |

### Critical Architecture Patterns
| Pattern | Implementation |
|---------|----------------|
| **Unified Person Model** | `unified_persons` → polymorphic "hats" (CRM, Recruit, Program, Employee) |
| **Row-Level Security** | All 120+ tables have RLS policies |
| **Type Safety** | Auto-generated `types/database.types.ts` from Supabase |
| **Zod Validation** | All inputs (forms, API, CSV) validated at boundary |

### Large Files (Refactoring Opportunities)
| File | Lines | Contains |
|------|-------|----------|
| `app/pages/roster/[id].vue` | 2,845 | Employee profile ("baseball card") |
| `app/pages/marketing/partnerships.vue` | 3,070 | Full CRM dashboard |
| `app/pages/marketing/partners.vue` | 2,455 | Marketing partner management |

These work correctly but could be decomposed into smaller components.

---

## ✅ What's Been Cleaned Up

- ✅ Archived old CSV/JSON data files
- ✅ Moved deprecated scripts to `scripts/deprecated/`
- ✅ Comprehensive documentation (README, structure guide, this file)
- ✅ Standardized naming conventions
- ✅ Verified no duplicate/old files
- ✅ 136 database migrations applied and tested

---

## 🔬 Module Deep Dive

### Skill/LMS System
```
Level 0: No Experience     → 🟠 Learner
Level 1: Exposure         → 🟠 Learner  
Level 2: Developing       → 🟡 Developing
Level 3: Competent        → 🔵 Works Independently
Level 4: Advanced         → 🔵 High Proficiency
Level 5: Mentor           → 🟢 Can Sign-Off Others
```
- **250+ skills** in library across clinical/administrative categories
- **Manager sign-off required** for level advancement
- **Courses linked to skills** - completion auto-advances proficiency
- Location: `app/pages/skills-library.vue`, `app/pages/academy/`

### Scheduling Engine
- **Service templates** define staffing requirements (e.g., "Surgery = 1 DVM + 2 Tech")
- **Conflict detection** via SQL checks across all locations
- **Draft state** allows staging changes before commit
- **AI suggestions** via OpenAI GPT-4 for smart shift filling
- Location: `app/pages/schedule/`, `app/stores/operations.ts`

### CRM/Partner System
- **Quintile ranking** using NTILE(5) on historical revenue
- **Relationship Health Score** (0-100) from tier + days since activity
- **Geolocation capture** on visit logging via browser API
- **EzyVet CSV import** for referral statistics
- Location: `app/pages/marketing/partnerships.vue`

### Recruiting Pipeline
- **AI resume parsing** via OpenAI → standardized database columns
- **Zod schema validation** for all candidate entry methods
- **Bulk CSV import** with field mapping wizard
- **Onboarding checklist** automation
- Location: `app/pages/recruiting/`, `app/components/recruiting/`

---

## 🤔 Reviewer Focus Areas

1. **Component Decomposition** - Should 2000+ line files be split?
2. **State Management** - Is Pinia being used effectively?
3. **Type Safety** - Are TypeScript patterns idiomatic?
4. **RLS Policies** - Is data properly isolated by role?
5. **Performance** - Any unnecessary re-renders in complex UIs?
6. **Mobile Responsiveness** - Touch targets adequate?

---

## 📊 Codebase Statistics

| Metric | Count |
|--------|-------|
| Vue Components | 100+ |
| Application Pages | 77 |
| Database Migrations | 136 |
| Database Tables | 120+ |
| Skills in Library | 250+ |
| Composables | 19 |
| Pinia Stores | 10+ |
| Active Scripts | ~30 |
| TypeScript Coverage | 100% |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Configure environment (contact for credentials)
cp .env.example .env

# Run development server
npm run dev
```

---

## 🎨 Code Conventions

| Convention | Standard |
|-----------|----------|
| Vue API | Composition API with `<script setup>` |
| Language | TypeScript (strict mode) |
| Components | Vuetify 3 (Material Design) |
| Styling | Tailwind utilities (supplementary) |
| State | Pinia stores (not Vuex) |
| Validation | Zod schemas at all boundaries |
| Icons | Material Design Icons (@mdi/font) |

---

## 🔒 Access Control (RBAC)

| Role | Access Level |
|------|--------------|
| `super_admin` | Full system + super admin panel |
| `admin` | Full system access |
| `manager` | Team management + reports |
| `marketing_admin` | Marketing module only |
| `employee` | Own profile + basic features |

All enforced via Supabase RLS policies at database level.

---

## 💡 Notes for Reviewers

**Don't worry about:**
- Console.log statements (intentional debugging)
- "TODO" comments (6 minor features, tracked)
- Deprecated scripts folder (kept for reference)

**Known gaps:**
- No unit tests yet (Vitest candidate)
- No Storybook (component documentation)
- Some large page files (refactoring opportunity)

---

## 🎯 Core Question

> **Is this codebase production-ready for a veterinary practice managing 50+ employees across 3 locations?**

The platform currently handles:
- Real employee data and schedules
- Live Slack notifications
- Actual payroll preparation
- Production partner CRM with 500+ clinics

---

*Last Updated: February 2026*

Thanks for reviewing! 🙏
