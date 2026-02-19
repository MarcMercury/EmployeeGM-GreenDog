# Access Control Reference

> **Consolidated Document:** Replaces ACCESS_MATRIX_AUDIT, ACCESS_MATRIX_DETAILED_ANALYSIS, ACCESS_MATRIX_COMPREHENSIVE_REVIEW, ACCESS_MATRIX_EXECUTIVE_SUMMARY, ACCESS_MATRIX_WIKI_CONSOLIDATION, and ACCESS_MATRIX_INTEGRATION_CHECKLIST.  
> **Last Updated:** February 2026

---

## 1. Role Hierarchy

The system defines **8 roles** in `app/types/index.ts`:

| # | Role Key | Display Name | Tier | Description |
|---|----------|-------------|------|-------------|
| 1 | `super_admin` | Super Admin | 200 | Full system access, user management |
| 2 | `admin` | Admin | 100 | Full system access (user list: view only) |
| 3 | `manager` | Manager | 80 | HR + Marketing + Ops, no Admin Ops |
| 4 | `hr_admin` | HR Admin | 60 | HR + Recruiting + Education + GDU |
| 5 | `sup_admin` | Supervisor | 55 | Between HR Admin and Office Admin |
| 6 | `office_admin` | Office Admin | 50 | Roster, Schedules, Time Off, Med Ops |
| 7 | `marketing_admin` | Marketing Admin | 40 | Marketing + CRM + GDU + Med Ops |
| 8 | `user` | User | 10 | Personal workspace + limited view access |

**Source of truth:** `ROLE_HIERARCHY` and `SECTION_ACCESS` in [app/types/index.ts](../../app/types/index.ts)

---

## 2. Section Access Matrix (Sidebar Visibility)

Defined in `SECTION_ACCESS` — controls which sidebar sections each role can see:

| Section | super_admin | admin | manager | hr_admin | sup_admin | office_admin | marketing_admin | user |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| My Workspace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Med Ops | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Recruiting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Marketing (edit) | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — |
| Marketing (view) | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| CRM & Analytics | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — |
| GDU (Education) | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| Admin Ops | ✅ | ✅ | — | — | — | — | — | — |
| Schedules (manage) | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — |
| Schedules (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Per-Role Page Access Matrix

> As of Feb 2026, Wiki is centralized at `/wiki` (Global section).

```
SUPER_ADMIN (200)
  Global: FULL (/activity, /wiki, /marketplace)
  My Workspace: FULL
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: FULL

ADMIN (100)
  Global: FULL
  My Workspace: FULL
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: FULL (except /admin/users: VIEW only)

MANAGER (80)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: NONE

HR_ADMIN (60)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL (except /schedule/builder: NONE)
  Med Ops: FULL
  Marketing: NONE
  CRM & Analytics: NONE
  GDU: FULL
  Admin Ops: NONE

SUP_ADMIN (55)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: NONE

OFFICE_ADMIN (50)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL
  Med Ops: FULL
  Marketing: VIEW (calendar, resources only)
  CRM & Analytics: NONE
  GDU: NONE
  Admin Ops: NONE

MARKETING_ADMIN (40)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: VIEW (roster, time-off only)
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: NONE

USER (10)
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: VIEW (roster, schedule, time-off only)
  Med Ops: FULL
  Marketing: VIEW (calendar, resources only)
  CRM & Analytics: NONE
  GDU: NONE
  Admin Ops: NONE
```

---

## 4. Middleware Reference

| Middleware | Allowed Roles | Use For |
|------------|---------------|---------|
| `auth` | Any authenticated user | Basic authentication |
| `admin` | super_admin, admin, manager | General admin tasks |
| `admin-only` | super_admin, admin | Strict admin only |
| `super-admin-only` | super_admin | Super admin only |
| `management` | super_admin, admin, manager, hr_admin, sup_admin, office_admin | HR/Recruiting sections |
| `marketing-admin` | super_admin, admin, manager, marketing_admin | Marketing section |
| `gdu` | super_admin, admin, manager, hr_admin, sup_admin, marketing_admin | GDU/Academy section |
| `schedule-access` | super_admin, admin, manager, sup_admin, office_admin | Schedule management |

---

## 5. Wiki Consolidation (February 2026)

The Wiki page was restructured as a central hub at `/wiki`:

- **Before:** Multiple Med Ops sub-pages (`/med-ops/wiki`, `/med-ops/calculators`, etc.) with per-page access entries
- **After:** Single `/wiki` page in "Global" section, FULL access for all 8 roles
- **Backward compatibility:** `/med-ops/wiki` and `/med-ops/index` redirect to `/wiki`
- **Data-level security:** Sensitive medical data still protected by RLS policies
- **Navigation:** Wiki appears as top-level item under Global section (sort order 105)

---

## 6. Database RLS Helper Functions

Created in Migration 181 — centralize role checks for RLS policies:

| Function | Roles Included |
|----------|---------------|
| `is_super_admin()` | super_admin |
| `is_admin()` | super_admin, admin |
| `is_hr_admin()` | super_admin, admin, manager, hr_admin, sup_admin, office_admin |
| `is_marketing_admin()` | super_admin, admin, manager, marketing_admin |
| `is_gdu_admin()` | super_admin, admin, manager, hr_admin, sup_admin, marketing_admin |
| `is_schedule_admin()` | super_admin, admin, manager, sup_admin, office_admin |
| `is_recruiting_admin()` | super_admin, admin, manager, hr_admin, sup_admin, office_admin |

---

## 7. Key Files

| File | Purpose |
|------|---------|
| [app/types/index.ts](../../app/types/index.ts) | Role types, hierarchy, section access matrix |
| [app/composables/useAccessMatrix.ts](../../app/composables/useAccessMatrix.ts) | Access matrix composable |
| [app/pages/admin/users.vue](../../app/pages/admin/users.vue) | User management UI |
| [server/agents/handlers/access-reviewer.ts](../../server/agents/handlers/access-reviewer.ts) | Access auditing agent |
| [ACCESS_CONTROL_AUDIT_COMPLETE.md](ACCESS_CONTROL_AUDIT_COMPLETE.md) | RLS policy audit (Migrations 180-183) |

---

## 8. Historical Notes

### Migration Conflicts (Resolved)
Migrations 143 and 144 originally defined conflicting access matrices. Migration 155 consolidated them into a single source of truth. Key fixes:
- Admin access to `/admin/users` clarified (VIEW, not FULL or NONE)
- Section names standardized across all definitions
- HR Admin Med Ops access set to FULL
- Marketplace restricted to super_admin/admin only

### "Supervisor" Role
The `sup_admin` role (tier 55) was added to bridge the gap between `hr_admin` and `office_admin`. Users previously labeled "Supervisor" without a matching role definition are now properly mapped.

---

*This document is the single source of truth for access control configuration. For RLS policy details, see [ACCESS_CONTROL_AUDIT_COMPLETE.md](ACCESS_CONTROL_AUDIT_COMPLETE.md).*
