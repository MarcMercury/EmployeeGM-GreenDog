/**
 * usePermissions Composable
 * 
 * Provides permission-aware UI functionality:
 * - Check if user can perform specific actions
 * - Hide/show UI elements based on permissions
 * - Show "Request Access" for restricted features
 * 
 * Usage:
 * const { can, canAny, canAll, showRequestAccess } = usePermissions()
 * 
 * v-if="can('manage:roster')"
 * v-if="canAny(['edit:candidates', 'view:candidates'])"
 */

import type { UserRole } from '~/types'

// Permission definitions - maps permissions to required roles
// super_admin has access to EVERYTHING and is always first in the list
// manager has full access to HR + Marketing + Recruiting + Education + Schedules
// hr_admin has HR + Recruiting + Schedules + Education
// marketing_admin has Marketing + GDU + Schedules (view only)
const PERMISSION_ROLES: Record<string, UserRole[]> = {
  // Roster & Team Management
  'view:roster': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:roster': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'edit:employee': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'delete:employee': ['super_admin', 'admin'],
  'view:salary': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  
  // Schedule Management
  'view:schedule': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:schedule': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'approve:timeoff': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'edit:own-schedule': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Recruiting
  'view:candidates': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin'],
  'manage:candidates': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'delete:candidates': ['super_admin', 'admin'],
  'hire:candidate': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  
  // Marketing & GDU
  'view:marketing': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  'manage:marketing': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  'view:gdu': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin'],
  'manage:gdu': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin'],
  'view:leads': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  'manage:leads': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  'view:partners': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  'manage:partners': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  
  // Academy & Training
  'view:academy': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:academy': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'create:course': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'enroll:course': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Admin Operations
  'view:admin': ['super_admin', 'admin'],
  'manage:settings': ['super_admin', 'admin'],
  'view:audit-logs': ['super_admin', 'admin'],
  'manage:integrations': ['super_admin', 'admin'],
  'export:data': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'bulk:delete': ['super_admin', 'admin'],
  'bulk:edit': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  
  // Medical Ops - Everyone has access
  'view:med-ops': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:med-ops': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'view:referrals': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'manage:referrals': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  
  // Performance & Reviews
  'view:reviews': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:reviews': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  'view:goals': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:team-goals': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin'],
  
  // Super Admin Exclusive
  'super:override': ['super_admin'],
  'manage:super-admin': ['super_admin'],
}

// Feature names for "Request Access" display
const FEATURE_NAMES: Record<string, string> = {
  'manage:roster': 'Team Management',
  'manage:schedule': 'Schedule Management',
  'manage:candidates': 'Recruiting Management',
  'view:salary': 'Salary Information',
  'approve:timeoff': 'Time Off Approvals',
  'manage:academy': 'Academy Administration',
  'view:admin': 'Admin Dashboard',
  'export:data': 'Data Export',
  'bulk:delete': 'Bulk Delete Operations',
  'view:audit-logs': 'Audit Logs',
}

export function usePermissions() {
  const authStore = useAuthStore()
  
  // Get current user's role
  const userRole = computed<UserRole>(() => authStore.userRole || 'user')
  
  // Check if user has a specific permission
  function can(permission: string): boolean {
    const allowedRoles = PERMISSION_ROLES[permission]
    if (!allowedRoles) {
      console.warn(`[Permissions] Unknown permission: ${permission}`)
      return false
    }
    return allowedRoles.includes(userRole.value)
  }
  
  // Check if user has ANY of the given permissions
  function canAny(permissions: string[]): boolean {
    return permissions.some(p => can(p))
  }
  
  // Check if user has ALL of the given permissions
  function canAll(permissions: string[]): boolean {
    return permissions.every(p => can(p))
  }
  
  // Get list of missing permissions for a feature
  function getMissingPermissions(permissions: string[]): string[] {
    return permissions.filter(p => !can(p))
  }
  
  // Check if we should show "Request Access" button
  function showRequestAccess(permission: string): boolean {
    return !can(permission) && !!FEATURE_NAMES[permission]
  }
  
  // Get the human-readable name for a permission/feature
  function getFeatureName(permission: string): string {
    return FEATURE_NAMES[permission] || permission
  }
  
  // Request access to a feature (placeholder - could email admin, create ticket, etc.)
  async function requestAccess(permission: string, reason?: string) {
    const client = useSupabaseClient()
    const toast = useToast()
    
    try {
      // Log the access request
      await client.from('activity_feed').insert({
        actor_id: authStore.profile?.id,
        action: 'access_request',
        entity_type: 'permission',
        entity_id: permission,
        metadata: {
          permission,
          feature: getFeatureName(permission),
          reason,
          user_role: userRole.value,
          requested_at: new Date().toISOString()
        }
      })
      
      toast.success(`Access request submitted for ${getFeatureName(permission)}`)
      return true
    } catch (err) {
      console.error('[Permissions] Failed to submit access request:', err)
      toast.error('Failed to submit access request')
      return false
    }
  }
  
  // Role hierarchy check
  function hasMinimumRole(role: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      super_admin: 200,
      admin: 100,
      manager: 80,
      hr_admin: 60,
      office_admin: 50,
      marketing_admin: 40,
      user: 10
    }
    return (hierarchy[userRole.value] || 0) >= (hierarchy[role] || 0)
  }
  
  // Check if user is admin (super_admin or admin)
  const isSuperAdmin = computed(() => userRole.value === 'super_admin')
  const isAdmin = computed(() => ['super_admin', 'admin'].includes(userRole.value))
  const isManager = computed(() => ['super_admin', 'admin', 'manager'].includes(userRole.value))
  const isHrAdmin = computed(() => ['super_admin', 'admin', 'manager', 'hr_admin'].includes(userRole.value))
  const isOfficeAdmin = computed(() => userRole.value === 'office_admin')
  const isMarketingAdmin = computed(() => userRole.value === 'marketing_admin')
  
  return {
    // State
    userRole,
    isSuperAdmin,
    isAdmin,
    isManager,
    isHrAdmin,
    isOfficeAdmin,
    isMarketingAdmin,
    
    // Permission checks
    can,
    canAny,
    canAll,
    hasMinimumRole,
    getMissingPermissions,
    
    // Request Access
    showRequestAccess,
    getFeatureName,
    requestAccess,
    
    // Constants (for reference)
    PERMISSION_ROLES,
    FEATURE_NAMES
  }
}
