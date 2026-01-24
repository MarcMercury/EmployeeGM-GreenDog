# ACCESS MATRIX MISMATCH ANALYSIS

## Critical Issue Found: Multiple Inconsistencies Between Migrations

### The Problem
User permissions are not matching the Access Matrix because there are **inconsistencies between two migrations** that define the access levels.

---

## Two Conflicting Versions of the Matrix

### Migration 143: `143_page_access_control.sql` (Original Definition)
This migration defines the page-level access based on **sections and paths**.

**Key Difference**: 
- Uses section-based logic mixed with path-based exceptions
- Marketing Admin has LIMITED marketing access (not full!)
- More granular control

Example - Marketing Admin in Migration 143:
```sql
WHEN v_role = 'marketing_admin' THEN 
  CASE 
    WHEN v_page.section = 'Dashboard & Profile' THEN 'full'
    WHEN v_page.section = 'Contact List' AND v_page.path = '/roster' THEN 'view'
    WHEN v_page.section = 'Operations' AND v_page.path IN ('/schedule', '/time-off') THEN 'view'
    WHEN v_page.section = 'Operations' AND v_page.path = '/training' THEN 'full'
    WHEN v_page.section = 'Recruiting' AND v_page.path IN ('/recruiting', '/recruiting/candidates') THEN 'view'
    WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU (Education)') THEN 'full'
    WHEN v_page.section = 'Admin & Settings' THEN 'none'
    ELSE 'none'
  END
```

### Migration 144: `144_update_page_definitions.sql` (Simplified/Changed Definition)
This migration **DELETES ALL existing page_access records** (line 210) and recreates them.

**Key Changes**:
- Completely different access logic!
- Admin user gets NONE access to `/admin/users` (but this should go to super_admin only!)
- Marketing Admin gets FULL Marketing/CRM/GDU
- Uses different page names/sections

Example - Marketing Admin in Migration 144:
```sql
WHEN v_role = 'marketing_admin' THEN 
  CASE 
    WHEN v_page.section = 'My Workspace' AND v_page.path != '/marketplace' THEN 'full'
    WHEN v_page.path = '/marketplace' THEN 'none'
    WHEN v_page.path = '/roster' THEN 'view'
    WHEN v_page.path = '/time-off' THEN 'view'
    WHEN v_page.path = '/recruiting' THEN 'view'
    WHEN v_page.section = 'Management' THEN 'none'
    WHEN v_page.section = 'Med Ops' THEN 'full'  -- Different!
    WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU') THEN 'full'
    WHEN v_page.section = 'Admin Ops' THEN 'none'
    ELSE 'none'
  END
```

---

## Specific Problems Identified

### 1. **Admin Role Access to User Management**
- **Migration 143**: Admin has FULL access to Admin Ops (including User Management)
- **Migration 144**: Admin gets NONE access to `/admin/users` specifically
- **Issue**: This is wrong! Only super_admin should manage user access matrix, but admin should still see the user list

### 2. **Section Name Changes**
- **Migration 143**: Uses sections like "Dashboard & Profile", "Admin & Settings", "GDU (Education)"
- **Migration 144**: Uses "My Workspace", "Admin Ops", "GDU"
- **Issue**: Section names in page_definitions don't match what's in the CASE statement!

### 3. **Manager Access**
- **Migration 143**: Manager has FULL access except "Admin & Settings" section
- **Migration 144**: Manager has FULL access except "Admin Ops" section AND no `/marketplace`
- **Issue**: No consistency on what manager should NOT access

### 4. **HR Admin Med Ops Access**
- **Migration 143**: Hr_admin has VIEW access to Med Ops
- **Migration 144**: Hr_admin has FULL access to Med Ops
- **Issue**: Inconsistent permissions

### 5. **Marketplace Access**
- **Migration 143**: No special handling for `/marketplace` path
- **Migration 144**: All roles except super_admin/admin get 'none' for marketplace
- **Issue**: Marketing feature was added after but inconsistently applied

---

## Section Mapping Issues

### What sections are actually in page_definitions?
From Migration 144, page_definitions insert shows:
- "My Workspace"
- "Management"
- "Med Ops"
- "Marketing"
- "CRM & Analytics"
- "GDU"
- "Admin Ops"

### What sections are in the CASE statement?
- "My Workspace" ✓ (matches)
- "Management" ✓ (matches)
- "Med Ops" ✓ (matches)
- "Marketing" ✓ (matches)
- "CRM & Analytics" ✓ (matches)
- "GDU" ✓ (matches)
- "Admin Ops" ✓ (matches)

**But the original migration 143 had different section names!**

---

## The User "Supervisor" Issue

**Root Cause**: The user reports logging in as "Supervisor" but only seeing "USER" access level.

### Possible Explanations:
1. **"Supervisor" is not a defined role** - It might be from old data or manual SQL
2. **The default fallback is 'user'** - If a role doesn't match any CASE statement, it returns 'none'
3. **Migration 144 might have cascaded permissions wrongly** - Recreating all records could have reset values

---

## Solution Approach

### Option 1: Audit & Fix (Recommended)
1. Verify which migration was applied last
2. Audit all users for invalid role values
3. Create new migration to establish single source of truth
4. Document the correct access matrix
5. Verify all page access records are correct

### Option 2: Revert to Migration 143 Logic
1. Identify what changed between 143 and 144
2. Determine if those changes were intentional
3. Revert if not intentional

### Option 3: Merge Both Definitions
1. Create comprehensive matrix combining both
2. Document each role's intended access
3. Create new migration with single source of truth

---

## Recommended Actions

### Immediate:
- [ ] Run audit-access-matrix.sql to see current state
- [ ] Check which migrations were applied in what order
- [ ] Verify if "Supervisor" exists in profiles table
- [ ] Check browser console for access matrix loading errors

### Short Term:
- [ ] Consolidate access definitions into single, clear matrix
- [ ] Create new migration 145 to establish single source of truth
- [ ] Update documentation
- [ ] Test all role access levels
- [ ] Verify useAccessMatrix composable is working

### Long Term:
- [ ] Consider moving access matrix to UI-configurable table
- [ ] Add audit logging for access changes
- [ ] Create test suite for access matrix
- [ ] Document decision matrix for each role
