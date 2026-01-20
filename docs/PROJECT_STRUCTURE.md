# Project Structure Overview

## 📁 Directory Organization

### `/app` - Main Application Code
The Nuxt 3 application source with Vue components, pages, and business logic.

```
app/
├── components/     # 61 Vue components (organized by feature)
├── composables/    # Reusable Vue composition functions
├── layouts/        # Page layouts (default, auth, etc.)
├── middleware/     # Route guards and access control
├── pages/          # 77 route pages (file-based routing)
├── plugins/        # Nuxt plugins (Vuetify, etc.)
├── stores/         # Pinia state management stores
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

### `/supabase` - Database & Backend
PostgreSQL database schema, migrations, and serverless functions.

```
supabase/
├── config.toml         # Supabase configuration
├── migrations/         # SQL migration files (136 total)
└── seed.sql           # Development data seeding
```

### `/server` - API Routes
Nuxt server routes for backend API endpoints.

```
server/
├── api/               # API endpoints
│   ├── slack/         # Slack integration endpoints
│   ├── ezyvet/        # EzyVet CRM sync
│   └── ...
└── utils/             # Server utilities
```

### `/scripts` - Utility Scripts
Database maintenance, migrations, and data import scripts.

```
scripts/
├── README.md          # Script documentation
├── deprecated/        # Archived one-time scripts
├── archive/           # Old data files
└── [active scripts]   # Current utility scripts
```

### `/docs` - Documentation
Technical documentation and credentials (gitignored).

```
docs/
├── UNIFIED_USER_LIFECYCLE.md  # Person lifecycle system
├── SLACK_INTEGRATION.md        # Slack integration guide
├── SUPABASE_OPERATIONS.md      # Database ops guide
├── INTEGRATIONS.md             # Third-party integrations
└── agents/                     # AI agent documentation
```

### `/public` - Static Assets
Public files served directly (robots.txt, etc.).

### `/assets` - Build Assets
Compiled assets (CSS, images) processed by Vite.

## 🎯 Code Organization Principles

### 1. Feature-Based Component Organization
Components are grouped by feature domain, not by type:

```
components/
├── academy/        # All academy/training components
├── dashboard/      # Dashboard widgets
├── employee/       # Employee-related components
├── growth/         # Marketing/growth components
├── operations/     # Operational components
└── ui/             # Shared UI primitives
```

### 2. Composables for Reusable Logic
Shared business logic extracted into composables:

- `useAppData` - Global data fetching
- `useDatabase` - Supabase helpers
- `useEmployeeData` - Employee queries
- `useLifecycle` - Person lifecycle operations
- `usePermissions` - RBAC logic
- `useSlack` - Slack API wrapper
- `useToast` - Toast notifications

### 3. Type-Safe Database Access
Generated TypeScript types from Supabase schema:

```typescript
// types/database.types.ts - Auto-generated
export type Database = {
  public: {
    Tables: {
      employees: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ...
    }
  }
}
```

### 4. Middleware for Access Control
Route guards enforce permissions:

- `auth.ts` - Require authentication
- `admin.ts` - Admin-only access
- `management.ts` - Manager+ access
- `gdu.ts` - GDU module access
- `marketing-admin.ts` - Marketing admin access

### 5. Store Pattern for State
Pinia stores manage application state:

```
stores/
├── auth.ts         # User session, permissions
├── employee.ts     # Employee data
├── academy.ts      # Training/course state
├── payroll.ts      # Payroll operations
└── ...
```

## 🔑 Key Technical Patterns

### Unified Person Model
Single `unified_persons` table with polymorphic "hats" (CRM, Recruiting, Program, Employee):

```sql
unified_persons (core identity)
  ├── person_crm_data (marketing hat)
  ├── person_recruiting_data (applicant hat)
  ├── person_program_data (student hat)
  └── person_employee_data (employee hat)
```

### Row-Level Security (RLS)
All database tables have Postgres RLS policies enforcing permissions at the data layer.

### Type-Safe API Calls
Supabase client with full TypeScript inference:

```typescript
const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('location', 'Venice')
// `data` is fully typed as Employee[]
```

### Reactive Data Fetching
Nuxt's `useAsyncData` for server-rendered data:

```typescript
const { data: employees, pending, refresh } = await useAsyncData(
  'employees',
  () => $fetch('/api/employees')
)
```

## 📊 Scale & Metrics

- **61 Components** - Modular, feature-organized
- **77 Pages** - Comprehensive application coverage
- **136 Migrations** - Evolutionary database schema
- **~30 Active Scripts** - Maintenance automation
- **10 Stores** - Organized state management
- **8 Middleware** - Fine-grained access control

## 🎨 Code Style

- **TypeScript** - Strict mode enabled
- **Vue 3 Composition API** - `<script setup>` syntax
- **Vuetify 3** - Material Design components
- **Tailwind CSS** - Utility-first styling (supplementary)
- **ESLint/Prettier** - Code formatting (implicit via Nuxt)

## 🔒 Security Model

- **Supabase Auth** - Email/password authentication
- **Row-Level Security** - Database-level access control
- **Role-Based Access Control (RBAC)** - 5 permission levels
- **Middleware Guards** - Route-level protection
- **Secure Secrets** - Environment variables for credentials
