# TeamOS System Capabilities Reference

> **Master Document:** Complete technical capabilities and business value of the TeamOS platform.  
> **Last Updated:** February 2026

---

## Executive Summary

TeamOS is an **enterprise unified operating system** that consolidates 8 discrete software verticals into a single, multi-tenant application for veterinary hospital networks. The platform replaces disparate legacy systems (ATS, HRIS, Scheduler, LMS, CRM, Marketing, Wiki, Education) with a monorepo architecture built on modern, type-safe technologies.

---

## 1. System Identity & Core Functions

### Platform Overview

| Attribute | Value |
|-----------|-------|
| **System Type** | Enterprise Resource Planning (ERP) |
| **Industry** | Veterinary Healthcare |
| **Architecture** | Monorepo, Type-Safe, Component-Based |
| **Deployment** | Vercel Edge (Global CDN) |
| **Data Layer** | Supabase (PostgreSQL + RLS) |

### The 8 Verticals

| # | Vertical | System Type | Primary Function |
|---|----------|-------------|------------------|
| 1 | **Talent Acquisition** | ATS | Recruitment pipeline, applicant tracking, AI resume parsing |
| 2 | **Human Resources** | HRIS | Employee data management, compliance, document warehousing |
| 3 | **Workforce Logistics** | Scheduler | Multi-location staffing, conflict resolution, resource forecasting |
| 4 | **Learning Management** | LMS | Competency tracking, proficiency levels, mentor sign-offs |
| 5 | **Partner Relations** | CRM | Referral management, dynamic ranking, revenue analytics |
| 6 | **Marketing & Outreach** | Marketing | Events, leads, influencer management |
| 7 | **Knowledge Management** | Wiki | Role-based SOPs, AI-powered Q&A |
| 8 | **Education Programs** | GDU | Internships, externships, cohorts, CE tracking |

---

## 2. Technical Architecture

### Stack Components

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend Framework | Vue 3 + Nuxt 3 | 3.5+ / 4.2+ | Type-safe SSR framework |
| UI Components | Vuetify 3 | 3.11+ | Material Design component library |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS (supplementary) |
| State Management | Pinia | 2.3+ | Reactive stores with persistence |
| Validation | Zod | 3.24+ | Runtime type safety at boundaries |
| Database | PostgreSQL | 15+ | Relational data via Supabase |
| Authentication | Supabase Auth | - | RBAC with 5 permission levels |
| File Storage | Supabase Storage | - | Secure document management |
| AI Integration | OpenAI GPT-4 | - | Resume parsing, scheduling, wiki |
| Hosting | Vercel Edge | - | Global CDN, auto-deploy |
| Notifications | Slack API | - | Bi-directional team sync |
| Data Sync | EzyVet CSV | - | Veterinary PIMS ingestion |

### Data Validation Strategy

All data entering the system is validated through Zod schemas:

```
User Input → Zod Schema → Database
CSV Import → Zod Schema → Database  
API Response → Zod Schema → Application State
```

This ensures type safety at every boundary, preventing invalid data from corrupting the system.

---

## 3. Module Specifications

### A. Competency & Training Module (LMS)

**Proficiency Scale:**

| Level | Category | Description | Permissions |
|-------|----------|-------------|-------------|
| 0 | 🟠 No Experience | Needs training | Cannot perform |
| 1 | 🟠 Exposure | Observed/assisted | Supervised only |
| 2 | 🟡 Developing | Growing proficiency | Limited scope |
| 3 | 🔵 Competent | Works independently | Full performance |
| 4 | 🔵 Advanced | High proficiency | Complex cases |
| 5 | 🟢 Mentor | Can teach others | **Sign-off authority** |

**Key Features:**
- 250+ skills organized by clinical/administrative categories
- JSON-backed skill library with metadata (description, category, prerequisites)
- RBAC restricts sign-off authority to Level 5 (Mentor) employees only
- Course completion auto-advances linked skill proficiency
- CE (Continuing Education) tracking with RACE compliance

### B. Workforce Scheduling Engine

**Service Templates:**
- Pre-defined staffing requirements (e.g., "Surgery = 1 DVM + 2 RVT")
- Configurable via admin interface at `/admin/services`

**Conflict Detection:**
- Deterministic SQL queries check existing shifts across all locations
- Prevents overlapping assignments for same employee
- Real-time validation during schedule building

**Draft State:**
- Schedule modifications staged locally in Pinia store
- Changes committed to database only on explicit publish
- Enables "what-if" scenario planning

**AI Suggestions:**
- OpenAI GPT-4 integration for smart shift filling
- Considers: employee skills, availability, scheduling rules, location
- Endpoint: `/api/ai/schedule-suggest.post.ts`

### C. Partner CRM (Referral Management)

**Ranking Algorithm:**
```sql
-- Partners segmented into quintiles based on total historical revenue
NTILE(5) OVER (ORDER BY COALESCE(total_revenue_all_time, 0) DESC) as tier
```

**Relationship Health Score (0-100):**
- Computed from: Revenue Tier + Days Since Last Activity
- Automatically decays without recent touchpoints
- Triggers follow-up alerts when below threshold

**Field Operations:**
- Geolocation capture on visit logging via browser API
- Verifies physical presence at partner location
- Stored as latitude/longitude coordinates

**Data Sources:**
- Manual entry via CRM interface
- EzyVet CSV import for referral statistics
- Automatic metric recalculation via SQL triggers

### D. Recruitment Pipeline (ATS)

**AI Resume Parsing:**
- OpenAI extracts structured data from unstructured PDF text
- Maps to standardized database columns
- Endpoint: `/api/recruiting/parse-resume.post.ts`

**Input Standardization:**
All candidate entry methods use unified Zod validation:
- Manual form entry
- Bulk CSV import
- Single file upload

**Schema Location:** `app/schemas/candidate.ts`

### E. Knowledge Base (Wiki)

**Features:**
- AI-powered search via OpenAI
- Category browsing (medical topics)
- Role-based content visibility
- Skill linkage to LMS records

**Safety Warning:**
AI-generated content includes disclaimer: "For educational purposes only. Always verify with established veterinary resources."

---

## 4. Data Integrity & Source of Truth

### Data Sources

| Data Type | Source | Update Method |
|-----------|--------|---------------|
| Clinical/Revenue Data | EzyVet PIMS | CSV parsing |
| Partner Activity | User interactions | Real-time logging |
| Employee Data | Manual entry | Form submission |
| Skills/Training | LMS modules | Course completion |

### Conflict Resolution

- **Timestamp Priority:** Most recent timestamp wins for activity logging
- **Automated Updates:** Referral data automatically updates partner status
- **Validation Layer:** Zod middleware rejects non-conforming payloads

### Row-Level Security (RLS)

Every table (120+) has PostgreSQL RLS policies enforcing:
- User role restrictions
- Ownership boundaries
- Manager hierarchy access

---

## 5. RBAC Permission Model

| Role | Level | Access Scope |
|------|-------|--------------|
| `super_admin` | 1 | Full system + super admin panel |
| `admin` | 2 | Full system access |
| `manager` | 3 | Team management + reports |
| `marketing_admin` | 4 | Marketing module only |
| `employee` | 5 | Own profile + basic features |

---

## 6. Integration Status

| Service | Status | Functions |
|---------|--------|-----------|
| Supabase | ✅ Live | Database, Auth, Storage, RLS, Edge Functions |
| OpenAI | ✅ Configured | Resume parsing, schedule suggestions, wiki Q&A |
| Slack | ✅ Configured | User sync, notifications, announcements |
| EzyVet | ✅ CSV Sync | Referral statistics, contact data |
| Vercel | ✅ Live | Hosting, CI/CD, environment management |
| GitHub | ✅ Live | Version control, PR previews |

---

## 7. Business Value Summary

### SaaS Consolidation

TeamOS replaces the following typical SaaS subscriptions:

| Category | Typical Products | Est. Annual Cost |
|----------|------------------|------------------|
| ATS | Workable, Greenhouse, Lever | $5,000-15,000 |
| HRIS | BambooHR, Gusto, Rippling | $3,000-10,000 |
| Scheduling | When I Work, Deputy, Homebase | $2,000-5,000 |
| LMS | TalentLMS, Lessonly, Trainual | $3,000-8,000 |
| CRM | HubSpot, Salesforce Essentials | $5,000-20,000 |
| Wiki | Notion Team, Confluence | $1,000-3,000 |
| **Total Potential Savings** | | **$19,000-61,000/year** |

### Operational Benefits

- **Single Sign-On:** One login for all functions
- **Unified Data:** No sync issues between disparate systems
- **Custom Workflows:** Tailored to veterinary dental operations
- **Data Ownership:** Full control over proprietary business data
- **Infinite Scalability:** No per-seat licensing constraints

---

## 8. Codebase Statistics

| Metric | Count |
|--------|-------|
| Database Migrations | 136 |
| Database Tables | 120+ |
| Application Pages | 77 |
| Vue Components | 100+ |
| Composables | 19 |
| Pinia Stores | 10+ |
| Skills in Library | 250+ |
| Active Scripts | ~30 |
| TypeScript Coverage | 100% |
| Locations Supported | 3 |
| RBAC Roles | 5 |

---

## 9. Reviewer Focus Areas

When auditing the codebase, prioritize:

1. **Component Modularity** - Verify complex interfaces are decomposed into performant sub-components
2. **State Persistence** - Confirm Pinia stores correctly persist transient data during navigation
3. **Type Safety** - Audit Zod schema coverage at all data boundaries
4. **RLS Policies** - Review PostgreSQL policies for proper data isolation
5. **Performance** - Check for unnecessary re-renders in complex UIs
6. **Mobile Responsiveness** - Validate touch targets and layouts

---

## 10. Document References

| Document | Purpose |
|----------|---------|
| `AGENT.md` | Primary AI context file |
| `README.md` | Project overview |
| `REVIEW_GUIDE.md` | Code review preparation |
| `docs/UNIFIED_USER_LIFECYCLE.md` | Person model architecture |
| `docs/PROJECT_STRUCTURE.md` | File organization |
| `docs/INTEGRATIONS.md` | Integration configuration |

---

*This document serves as the authoritative technical reference for the TeamOS platform capabilities.*
