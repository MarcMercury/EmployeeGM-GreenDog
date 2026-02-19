# Comprehensive Access Matrix Review & Fix Guide

## Executive Summary

The access matrix system has **critical inconsistencies** between Migration 143 and Migration 144 that cause incorrect permission assignment. When users login with certain roles (e.g., Supervisor, Manager), they may see restricted access compared to what's defined in the Access Matrix.

**Status**: ✅ Root cause identified | 📋 Fix provided | ⏳ Testing required

---

## Issues Identified

### 1. **Conflicting Migration Definitions** ❌
- **Migration 143** defines access matrix one way
- **Migration 144** redefines it completely differently
- **Result**: Last migration wins, potentially overriding intended permissions

**Details**:
| Aspect | Migration 143 | Migration 144 |
|--------|---------------|---------------|
| Admin to /admin/users | 'full' | 'none' ✓ (Better) |
| Manager to Admin Ops | 'none' | 'none' |
| Hr_admin to Med Ops | 'view' | 'full' ✓ (Better) |
| Marketing_admin scope | Limited | Full |
| User role access | Limited | Limited |
| Section names | "Admin & Settings" | "Admin Ops" |

### 2. **"Supervisor" Role Not Defined** ❌
- Users report logging in as "Supervisor" role
- System only defines 7 roles: super_admin, admin, manager, hr_admin, office_admin, marketing_admin, user
- **Result**: Invalid role falls through to default access (typically 'none')

**Solution**: Either:
- Create a 'supervisor' role, OR  
- Migrate all supervisor users to 'manager' or 'hr_admin'

### 3. **UI Label Confusion** ⚠️
- User Management shows "Access Level" dropdown
- This is actually the **Role** selector
- True access levels (full/view/none) come from Access Matrix
- **Result**: Users confused about what they're configuring

**Location**: [app/pages/admin/users.vue](app/pages/admin/users.vue#L1037)

### 4. **Missing Role Validation** ⚠️
- Database has no constraint preventing invalid roles on page_access table
- Users with invalid roles fall back to 'none' access
- No audit trail showing what changed or when

### 5. **Data Integrity Issues** ⚠️
- `page_access` table might have stale entries from before section rename
- No foreign key references to ensure consistency
- Potential orphaned records if pages were deleted

---

## Access Matrix Current State

### Correct Role Hierarchy (By Tier)

1. **super_admin** (tier 200) ⭐ Full access, manage everything
2. **admin** (tier 100) ⭐ Full access except user management
3. **manager** (tier 80) 👔 HR, Marketing, Operations - no admin
4. **hr_admin** (tier 60) 👥 HR, Recruiting, Education, limited ops
5. **office_admin** (tier 50) 🏢 Roster, Schedules, Approvals
6. **marketing_admin** (tier 40) 📣 Marketing, CRM, GDU, limited mgmt
7. **user** (tier 10) 👤 Personal workspace, view-only access

### Per-Role Page Access Matrix

```
NOTE: As of Feb 2026, Wiki is centralized at /wiki (Global section)
All Med Ops medical knowledge is accessed through the Wiki hub.

SUPER_ADMIN
  Global: FULL (/activity, /wiki, /marketplace)
  My Workspace: FULL
  Management: FULL  
  Med Ops: FULL (boards, calculators, facilities, partners)
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: FULL

ADMIN
  Global: FULL
  My Workspace: FULL
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: FULL (except /admin/users: VIEW only)

MANAGER
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: NONE

HR_ADMIN
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL (except /schedule/builder: NONE)
  Med Ops: FULL
  Marketing: NONE
  CRM & Analytics: NONE
  GDU: FULL
  Admin Ops: NONE

OFFICE_ADMIN
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: FULL
  Med Ops: FULL
  Marketing: VIEW (calendar, resources only)
  CRM & Analytics: NONE
  GDU: NONE
  Admin Ops: NONE

MARKETING_ADMIN
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: VIEW (roster, time-off only)
  Med Ops: FULL
  Marketing: FULL
  CRM & Analytics: FULL
  GDU: FULL
  Admin Ops: NONE

USER
  Global: FULL
  My Workspace: FULL (except /marketplace: NONE)
  Management: VIEW (roster, schedule, time-off only)
  Med Ops: FULL
  Marketing: VIEW (calendar, resources only)
  CRM & Analytics: NONE
  GDU: NONE
  Admin Ops: NONE
```

### Global Section (Feb 2026 Addition)
- **Activity Hub** (`/activity`) - Notifications and activity feed (all users)
- **Wiki** (`/wiki`) - Central knowledge base with medical resources, procedures, policies (all users)
- **Marketplace** (`/marketplace`) - Super admin only marketplace features


---

## Implementation Checklist

### Phase 1: Audit & Assessment ✅
- [x] Identify conflicting migrations
- [x] Document current state
- [x] Identify all inconsistencies
- [x] Find all affected roles

### Phase 2: Fix Migration 📋
- [x] Created Migration 155: `155_consolidate_access_matrix.sql`
  - Consolidates both migration definitions
  - Establishes single source of truth
  - Rebuilds complete access matrix
  - Verifies data integrity

### Phase 3: Implementation (Before applying)
- [ ] Review Migration 155 with team
- [ ] Verify all role definitions are correct
- [ ] Confirm no custom roles need migration
- [ ] Backup current database state
- [ ] Test on staging environment

### Phase 4: Validation
- [ ] Run `scripts/audit-access-matrix.sql` to verify completeness
- [ ] Check for any users with invalid roles
- [ ] Test login with each role type
- [ ] Verify Access Matrix UI displays correctly
- [ ] Check browser console for errors
- [ ] Verify API endpoints return correct access

### Phase 5: Documentation
- [ ] Update [docs/ACCESS_MATRIX_AUDIT.md](docs/ACCESS_MATRIX_AUDIT.md)
- [ ] Update [docs/ACCESS_MATRIX_DETAILED_ANALYSIS.md](docs/ACCESS_MATRIX_DETAILED_ANALYSIS.md)
- [ ] Document in [AGENT.md](AGENT.md)
- [ ] Add comments to migrations

### Phase 6: Cleanup
- [ ] Check for "supervisor" users that need role migration
- [ ] Remove Migration 144 comment about deleting records if needed
- [ ] Consider archiving old audit notes

---

## Testing Plan

### Unit Tests
```typescript
// Test matrix completeness
- All roles defined in database
- All pages have access records for all roles
- No orphaned page_access records
- No missing access records

// Test role hierarchy
- super_admin can access everything
- admin can access everything except user mgmt
- Permissions follow tier order
```

### Integration Tests
```typescript
// Test page access checks
- getAccess(pageId, roleKey) returns correct level
- getAccessByPath(path, roleKey) returns correct level
- Super admin always gets 'full'
- Invalid roles return 'none'

// Test permission enforcement
- Users see correct nav items
- Users can't access restricted pages
- Admins can't manage user access without super_admin
```

### Manual Testing
```
1. Login as each role type
2. Navigate to each page section
3. Verify visible/hidden nav items
4. Check Access Matrix UI
5. Attempt permission-restricted actions
6. Verify error handling
```

### Regression Tests
```
1. Verify existing user access still works
2. Verify role changes take effect immediately
3. Verify API returns correct access levels
4. Verify middleware blocks restricted access
```

---

## How to Apply the Fix

### Step 1: Backup
```bash
# Backup current database
supabase db pull
git commit -m "backup: database state before access matrix fix"
```

### Step 2: Apply Migration
```bash
# Option A: Via Supabase Dashboard
# - Go to SQL Editor
# - Copy contents of supabase/migrations/155_consolidate_access_matrix.sql
# - Run in SQL Editor
# - Verify success

# Option B: Via Supabase CLI
supabase migration up
```

### Step 3: Verify Migration
```bash
# Run audit script
psql -d $DATABASE_URL -f scripts/audit-access-matrix.sql

# Check for any warnings or errors
# Verify row counts match expected values
```

### Step 4: Test Access
```bash
# For each role:
# 1. Login as that role
# 2. Check permissions work correctly
# 3. Try to access restricted pages (should be blocked)
# 4. Check browser console for errors
```

### Step 5: Deploy
```bash
# Push to production
git push
# Verify in prod after deployment
```

---

## Files Modified/Created

### New Files
- ✅ [supabase/migrations/155_consolidate_access_matrix.sql](supabase/migrations/155_consolidate_access_matrix.sql) - Fix migration
- ✅ [scripts/audit-access-matrix.sql](scripts/audit-access-matrix.sql) - Audit script
- ✅ [docs/ACCESS_MATRIX_AUDIT.md](docs/ACCESS_MATRIX_AUDIT.md) - Audit report
- ✅ [docs/ACCESS_MATRIX_DETAILED_ANALYSIS.md](docs/ACCESS_MATRIX_DETAILED_ANALYSIS.md) - Detailed analysis

### Existing Files (No changes needed yet)
- [app/composables/useAccessMatrix.ts](app/composables/useAccessMatrix.ts) - Logic is correct
- [app/pages/admin/users.vue](app/pages/admin/users.vue) - UI is correct
- [server/api/admin/access-matrix.ts](server/api/admin/access-matrix.ts) - API is correct
- [app/types/index.ts](app/types/index.ts) - Types are correct

### Optional Improvements (Not critical)
- Consider renaming "Access Level" label to "Role" in users.vue
- Add validation to reject invalid roles
- Add audit logging for access changes
- Create role management UI

---

## Known Limitations & TODOs

### Current System Limitations
1. **No audit trail** - No way to see who changed access when
2. **Hardcoded in migrations** - Access matrix is defined in SQL migrations
3. **No role description** - Roles don't explain their permissions clearly
4. **No permission grouping** - Can't organize permissions by feature
5. **UI label confusion** - "Access Level" really means "Role"

### Recommended Future Improvements
1. Move access matrix to configurable table instead of migrations
2. Add audit logging: `access_changes` table
3. Create permission grouping system
4. Build role management UI with visual matrix
5. Add role templates for common patterns
6. Create role testing suite
7. Add auto-documentation of permissions

---

## Support & Questions

### If a user still can't access something after fix:
1. Verify their role is one of: super_admin, admin, manager, hr_admin, office_admin, marketing_admin, user
2. Check the matrix above for that role's permissions
3. Run audit script to verify access records exist
4. Check browser console for errors
5. Check server logs for access denial
6. Ask: Did they have this access before? (Maybe intentional restriction)

### If access is too restrictive:
1. Check current role tier level
2. Review matrix to confirm expectations
3. Consider promoting to higher role
4. Or create new role with different permissions
5. Update this documentation when changes are made

### If confused about permission model:
1. Read the Role Hierarchy section above
2. Check the Per-Role Page Access Matrix
3. Remember: Role determines base access; Pages define granular levels
4. Ask: Is this page-level access or feature-level permission?

---

## Questions for Team

Before implementing, please clarify:

1. **Supervisor Role**: Should this exist? If yes, what should its permissions be?
2. **Manager Access**: Should managers be able to view/edit user list?
3. **Admin to /admin/users**: Should be 'view' only or 'full'?
4. **Hr_admin Med Ops**: Should have full or view access?
5. **Marketing Scope**: Should marketing_admin have marketing section full access?

---

## Approval Sign-Off

- [ ] Manager Review: _______________  Date: _______
- [ ] Technical Review: _______________  Date: _______
- [ ] User Testing: _______________  Date: _______
- [ ] Production Deploy: _______________  Date: _______

---

**Last Updated**: January 24, 2026  
**Status**: Ready for Implementation  
**Migration**: 155_consolidate_access_matrix.sql
