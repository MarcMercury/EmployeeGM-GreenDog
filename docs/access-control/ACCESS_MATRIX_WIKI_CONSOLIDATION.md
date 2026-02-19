# Access Matrix Update: Wiki Consolidation (February 2026)

## Summary of Changes

**Effective Date:** February 18, 2026

Yesterday, the Wiki page was restructured as a **central hub** accessible at `/wiki` with tiles/categories leading to Med Ops resources, facility management, and medical partners. This document outlines the access control implications and updates.

---

## What Changed

### Previous Structure
- **Med Ops Wiki** (`/med-ops/wiki`) - User had to navigate through Med Ops section
- **Med Ops Calculators** (`/med-ops/calculators`) - Separate nav item
- **Med Ops Boards** (`/med-ops/boards`) - Separate nav item
- **Facility Resources** - Part of Med Ops section
- **Medical Partners** - Part of Med Ops section

**Access Control Model**: Individual pages had separate access matrix entries. Permissions were checked per-page.

### New Structure  
- **Wiki Hub** (`/wiki`) - Single navigation entry, global access
  - Resources Zone (Company policies, facility vendors, medical partners)
  - Browse by Category (Policies, protocols, procedures)
  - Search functionality across all resources
  - Facility Resources subsection
  - Medical Partners subsection

- **Redirect Pages** (for backwards compatibility):
  - `/med-ops/wiki` → redirects to `/wiki`
  - `/med-ops/index` → redirects to `/wiki`

**Access Control Model**: Single page access point. Permission checked at `/wiki` level. Users who can access `/wiki` can see all tiles/resources.

---

## Access Matrix Changes

### Before (Old Model)
```
Section: Med Ops
├── /med-ops/wiki → [Full, View, None - per role]
├── /med-ops/calculators → [Full, View, None - per role]
├── /med-ops/boards → [Full, View, None - per role]
├── /med-ops/facilities → [Full, View, None - per role]
└── /med-ops/partners → [Full, View, None - per role]
```

### After (New Model)
```
Section: Global (same tier as Activity Hub, Marketplace)
└── /wiki → [Full access for ALL authenticated roles]
      └── Tiles (Policies, Facilities, Partners, etc.) - visible if user can see /wiki
```

---

## Role Access to Wiki

All authenticated users (every role) have **FULL** access to `/wiki`:

| Role | Access Level |
|------|--------------|
| super_admin | **FULL** |
| admin | **FULL** |
| manager | **FULL** |
| hr_admin | **FULL** |
| sup_admin | **FULL** |
| office_admin | **FULL** |
| marketing_admin | **FULL** |
| user | **FULL** |

**Rationale**: The Wiki is a knowledge base containing company policies, procedures, and resources that all staff need access to. Traditional role-based granular control isn't appropriate here. Sensitive content (medical procedures, etc.) is controlled at the data layer via RLS policies, not page access.

---

## Database Changes Applied

### Migrations Updated
- **20250212000002_fix_access_matrix_nav_alignment.sql** - Added `/wiki` page definition with full access for all roles

### Page Definitions
```sql
-- Added:
('/wiki', 'Wiki', 'Global', 'mdi-book-open-page-variant', 105, true)

-- Page Access Entries:
-- All 8 roles + /wiki = access_level: 'full'
```

### Nav Alignment
- `/wiki` added with `sort_order: 105` (top of Global section, after Activity Hub at 100)
- `/med-ops/wiki` remains in page_definitions but redirects to `/wiki`
- Med Ops section still contains `/med-ops/calculators`, `/med-ops/boards`, etc. for backward compatibility

---

## UI/Navigation Updates

### Navigation Bar (AppSidebar.vue)
- **Global Section** (always visible to all authenticated users):
  - Activity Hub (`/activity`)
  - **Wiki** (`/wiki`) ← **NEW**
  - Marketplace (`/marketplace`)

The Wiki is a **top-level navigation item**, not nested under Med Ops.

### Old Sidebar References
- `/med-ops/wiki` subnavigation removed
- Med Ops group now contains only:
  - Med Ops Boards (`/med-ops/boards`)
  - Medical Calculators (`/med-ops/calculators`) - if we keep this as separate nav item

---

## Access Control Implications

### What This Means

1. **Authentication Barrier**: Users must be logged in to see Wiki (enforced by auth middleware)
2. **No Page-Level Granularity**: All authenticated users can access all Wiki sections
3. **Data-Level Control**: Sensitive medical data still protected by RLS policies at the database layer
4. **Content Visibility**: Individual tiles/resources may have frontend logic to hide irrelevant content per role

### Example: User Role Accessing Wiki

```
User (tier 10) tries to access /wiki
├─ Passes auth middleware? YES
├─ Checks page_access(/wiki, user)? FULL ✓
├─ Loads Wiki page? YES
├─ Can see all resource tiles? YES (frontend renders all)
└─ Can click into resources? YES (or NO if data RLS blocks it)
```

---

## Backward Compatibility

### Redirect Handling
If users have bookmarked `/med-ops/wiki`, they will be automatically redirected to `/wiki`:

```vue
<!-- app/pages/med-ops/wiki.vue -->
<script setup>
const router = useRouter()
onMounted(() => {
  router.replace('/wiki')
})
</script>
```

### Old Database Entries
The old `/med-ops/wiki` entry in `page_definitions` is kept but deprecated:
- Path exists in database for audit trails
- Page access records still exist
- Redirected in the UI layer (no dead links)

---

## Testing Checklist

- [ ] All 8 roles can access `/wiki` without restrictions
- [ ] `/med-ops/wiki` redirects to `/wiki`
- [ ] `/med-ops/index` redirects to `/wiki`
- [ ] Wiki page loads all resource tiles
- [ ] Search functionality works across roles
- [ ] Facility resources subsection loads and filters correctly
- [ ] Medical partners subsection loads and displays correctly
- [ ] Recent searches saved/restored from localStorage
- [ ] Access Matrix UI shows `/wiki` in Global section
- [ ] No console errors when loading Wiki page
- [ ] Mobile navigation includes Wiki
- [ ] Breadcrumb navigation handles Wiki paths correctly

---

## Agents & Systems Updated

### Access Reviewer Agent (server/agents/handlers/access-reviewer.ts)
- ✅ Updated KNOWN_APP_ROUTES to include `/wiki` in Global section
- ✅ Removed `/med-ops/wiki` from routes (now a redirect)
- ✅ Added comment explaining the consolidation

**Impact**: The agent will no longer flag `/med-ops/wiki` as a missing page. It will verify that `/wiki` has access entries for all roles.

---

## Future Considerations

### If We Want Fine-Grained Control Future
If we ever need to restrict specific roles from Wiki sections:
1. Create separate pages under `/wiki/` (e.g., `/wiki/policies`, `/wiki/facilities`)
2. Add them to page_definitions with per-role access_level
3. Update navigation to conditionally show sections

### Performance
- Single page load reduces frontend bundle size impact
- Search loads data on-demand from server
- No change to database query patterns (RLS still applies)

### Content Management
- All Wiki content managed through single `/wiki.vue` component
- Resource buttons and categories defined in component state
- Facility resources loaded from database
- Medical partners loaded from database

---

## Questions & Answers

**Q: Can we prevent a role from seeing the Wiki?**
A: Not via page access matrix. All roles have FULL access to `/wiki`. To restrict, you'd need:
- Update page_access entry for that role to 'none'
- Update auth middleware to block that role from `/wiki` (frontend)
- Data-level RLS policies will still apply if they try to query resources

**Q: What if a user is marked as inactive/disabled?**
A: The auth middleware checks this before allowing any page access. Inactive users can't reach `/wiki` or any other page.

**Q: Are the tiles nested pages?**
A: No, they're Vue components within the `/wiki.vue` file. They use `v-if` conditionals to show/hide different content zones. Not separate routes.

**Q: What about the /med-ops/* routes that still exist?**
A: They remain in navigation for structured pages (boards, calculators, facilities). Only `/med-ops/wiki` redirects to `/wiki`. The others stay as separate pages because:
- `/med-ops/boards` = detailed medical boards view (separate functionality)
- `/med-ops/calculators` = specialized calculators (separate functionality)
- `/wiki` = knowledge base + resources hub (consolidated view)

---

## Related Documentation

- [ACCESS_MATRIX_COMPREHENSIVE_REVIEW.md](ACCESS_MATRIX_COMPREHENSIVE_REVIEW.md) - Full access control architecture
- [ACCESS_CONTROL_AUDIT_COMPLETE.md](ACCESS_CONTROL_AUDIT_COMPLETE.md) - RLS policies and database controls
- [REVIEW_GUIDE.md](../REVIEW_GUIDE.md#wiki) - System overview including Wiki module
- [AGENT.md](../AGENT.md#navigation--page-link-auditing) - Agent navigation audit requirements

