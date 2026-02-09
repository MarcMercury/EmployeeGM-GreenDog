/**
 * Server-side Role Constants
 * Single source of truth for role-based access checks in API endpoints.
 * These mirror the SECTION_ACCESS matrix in app/types/index.ts.
 *
 * IMPORTANT: Keep in sync with SECTION_ACCESS in app/types/index.ts.
 * If you add a new role or change access, update BOTH files.
 */

// All valid roles in the system
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'hr_admin' | 'sup_admin' | 'office_admin' | 'marketing_admin' | 'user'

export const ALL_VALID_ROLES: readonly UserRole[] = [
  'super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'
] as const

// =====================================================
// Section-based role groups (matches SECTION_ACCESS)
// =====================================================

/** Admin Ops: User Management, System Settings — super_admin, admin */
export const ADMIN_ROLES: readonly UserRole[] = ['super_admin', 'admin'] as const

/** HR: Schedule, Time Off, Recruiting, Payroll, Master Roster */
export const HR_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin'] as const

/** Recruiting (sub-section of HR) */
export const RECRUITING_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin'] as const

/** Marketing: Calendar, Events, Leads, Partners, Inventory, Resources */
export const MARKETING_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin'] as const

/** CRM & Analytics: EzyVet CRM, Analytics, List Hygiene */
export const CRM_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin'] as const

/** Education/GDU: GDU Dash, Student CRM, Visitor CRM, CE Events */
export const EDUCATION_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin'] as const

/** Schedule management: Create/edit schedules */
export const SCHEDULE_MANAGE_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'sup_admin', 'office_admin'] as const

// =====================================================
// Feature-specific role groups
// =====================================================

/** Marketplace admin: Create/manage gigs and rewards */
export const MARKETPLACE_ADMIN_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'hr_admin'] as const

/** Deactivate/disable employees (destructive action) */
export const DEACTIVATE_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'hr_admin', 'manager'] as const

/** Slack integration management */
export const SLACK_ADMIN_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin'] as const

/** Compliance resolution */
export const COMPLIANCE_ROLES: readonly UserRole[] = ['super_admin', 'admin', 'hr_admin', 'manager'] as const

// =====================================================
// Helpers
// =====================================================

/** Check if a role is in an allowed list */
export function hasRole(role: string | null | undefined, allowedRoles: readonly string[]): boolean {
  if (!role) return false
  return allowedRoles.includes(role)
}

/** Check if a role is super_admin */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin'
}

/** Check if a role is admin-level (super_admin or admin) */
export function isAdminLevel(role: string | null | undefined): boolean {
  return hasRole(role, ADMIN_ROLES)
}
