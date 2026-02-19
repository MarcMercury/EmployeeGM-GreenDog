# Access Matrix Audit Report
## Issue: User Access Levels Not Reflecting Matrix

**Date**: January 24, 2026  
**Issue**: User logged in as Supervisor role only shows "USER" access level  
**Status**: Under Investigation

---

## Current Role Hierarchy

Based on the database migrations and type definitions, here's the current system:

### Defined Roles (from database)
1. **super_admin** (tier 200) - Full system access
2. **admin** (tier 100) - Full system access
3. **manager** (tier 80) - HR + Marketing + Recruiting + Schedules
4. **hr_admin** (tier 60) - HR + Recruiting + Schedules + Education
5. **office_admin** (tier 50) - Roster, Schedules, Time Off, Med Ops
6. **marketing_admin** (tier 40) - Marketing + GDU + Schedules (view only)
7. **user** (tier 10) - Dashboard, Own Profile, Own Schedule, Med Ops

### Key Files Involved
- [app/types/index.ts](app/types/index.ts) - Role type definitions
- [app/composables/useAccessMatrix.ts](app/composables/useAccessMatrix.ts) - Access matrix logic
- [app/pages/admin/users.vue](app/pages/admin/users.vue) - User management UI
- [supabase/migrations/143_page_access_control.sql](supabase/migrations/143_page_access_control.sql) - Access matrix setup
- [server/api/admin/access-matrix.ts](server/api/admin/access-matrix.ts) - Backend access API

---

## Problems Identified

### 1. **Missing Role Reference**
- User reports "Supervisor" role but this role is NOT defined in the system
- Current system only has: super_admin, admin, manager, hr_admin, office_admin, marketing_admin, user

### 2. **UI Label Confusion**
- In User Management, the dropdown is labeled "Access Level" but is actually selecting the **Role**
- The actual page-level access is determined by the Access Matrix (page_access table)
- This causes confusion - users think they're setting granular access, but they're actually just setting the role

### 3. **Potential Data Issue**
- If supervisor was previously assigned to users before the role was removed, those users would be stuck
- Database would have invalid role values that don't match the constraint

---

## Access Matrix by Section

### Manager (tier 80)
- **Dashboard & Profile**: FULL
- **Contact List**: FULL
- **Operations**: FULL (except Schedule Builder: NONE)
- **Recruiting**: FULL
- **Marketing**: FULL
- **CRM & Analytics**: FULL
- **GDU (Education)**: FULL
- **Admin & Settings**: NONE
- **Med Ops**: FULL

### HR Admin (tier 60)
- **Dashboard & Profile**: FULL
- **Contact List**: FULL
- **Operations**: FULL (Schedule: VIEW, Time Off: VIEW, Others: FULL, Schedule Builder: NONE)
- **Recruiting**: FULL
- **Marketing**: NONE
- **CRM & Analytics**: NONE
- **GDU (Education)**: FULL
- **Admin & Settings**: NONE
- **Med Ops**: VIEW

### Office Admin (tier 50)
- **Dashboard & Profile**: FULL
- **Contact List**: FULL
- **Operations**: FULL
- **Recruiting**: FULL
- **Marketing**: NONE
- **CRM & Analytics**: NONE
- **GDU (Education)**: NONE
- **Admin & Settings**: NONE
- **Med Ops**: NONE

### Marketing Admin (tier 40)
- **Dashboard & Profile**: FULL
- **Contact List**: VIEW (Roster only)
- **Operations**: VIEW (Schedule, Time Off), FULL (Training)
- **Recruiting**: VIEW
- **Marketing**: FULL
- **CRM & Analytics**: FULL
- **GDU (Education)**: FULL
- **Admin & Settings**: NONE
- **Med Ops**: NONE

### User (tier 10)
- **Dashboard & Profile**: FULL
- **Contact List**: VIEW (Roster only)
- **Operations**: VIEW (Schedule, Time Off, Training)
- **Recruiting**: NONE
- **Marketing**: NONE
- **CRM & Analytics**: NONE
- **GDU (Education)**: NONE
- **Admin & Settings**: NONE
- **Med Ops**: NONE

---

## Recommended Investigation Steps

1. ✅ Verify all role_definitions are properly seeded
2. ✅ Verify page_definitions are complete
3. ⏳ Verify page_access records match the matrix
4. ⏳ Check if any users have invalid role values
5. ⏳ Verify the useAccessMatrix composable is loading data correctly
6. ⏳ Test the Access Matrix UI in admin/users.vue
7. ⏳ Verify middleware is correctly checking access levels

---

## Next Steps

1. Run comprehensive SQL audit of page_access table
2. Verify all users have valid roles
3. Check Access Matrix UI for display issues
4. Create migration to fix any discovered data issues
