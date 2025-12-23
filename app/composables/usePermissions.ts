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
const PERMISSION_ROLES: Record<string, UserRole[]> = {
  // Roster & Team Management
  'view:roster': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:roster': ['admin', 'office_admin'],
  'edit:employee': ['admin', 'office_admin'],
  'delete:employee': ['admin'],
  'view:salary': ['admin', 'office_admin'],
  
  // Schedule Management
  'view:schedule': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:schedule': ['admin', 'office_admin'],
  'approve:timeoff': ['admin', 'office_admin'],
  'edit:own-schedule': ['admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Recruiting
  'view:candidates': ['admin', 'office_admin', 'marketing_admin'],
  'manage:candidates': ['admin', 'office_admin'],
  'delete:candidates': ['admin'],
  'hire:candidate': ['admin', 'office_admin'],
  
  // Marketing & GDU
  'view:marketing': ['admin', 'marketing_admin'],
  'manage:marketing': ['admin', 'marketing_admin'],
  'view:gdu': ['admin', 'marketing_admin'],
  'manage:gdu': ['admin', 'marketing_admin'],
  'view:leads': ['admin', 'marketing_admin'],
  'manage:leads': ['admin', 'marketing_admin'],
  'view:partners': ['admin', 'marketing_admin'],
  'manage:partners': ['admin', 'marketing_admin'],
  
  // Academy & Training
  'view:academy': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:academy': ['admin', 'office_admin'],
  'create:course': ['admin', 'office_admin'],
  'enroll:course': ['admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Admin Operations
  'view:admin': ['admin'],
  'manage:settings': ['admin'],
  'view:audit-logs': ['admin'],
  'manage:integrations': ['admin'],
  'export:data': ['admin', 'office_admin'],
  'bulk:delete': ['admin'],
  'bulk:edit': ['admin', 'office_admin'],
  
  // Medical Ops
  'view:med-ops': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:med-ops': ['admin', 'office_admin'],
  'view:referrals': ['admin', 'office_admin'],
  'manage:referrals': ['admin', 'office_admin'],
  
  // Performance & Reviews
  'view:reviews': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:reviews': ['admin', 'office_admin'],
  'view:goals': ['admin', 'office_admin', 'marketing_admin', 'user'],
  'manage:team-goals': ['admin', 'office_admin'],
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
      admin: 100,
      office_admin: 50,
      marketing_admin: 40,
      user: 10
    }
    return (hierarchy[userRole.value] || 0) >= (hierarchy[role] || 0)
  }
  
  // Check if user is admin
  const isAdmin = computed(() => userRole.value === 'admin')
  const isOfficeAdmin = computed(() => userRole.value === 'office_admin')
  const isMarketingAdmin = computed(() => userRole.value === 'marketing_admin')
  
  return {
    // State
    userRole,
    isAdmin,
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
