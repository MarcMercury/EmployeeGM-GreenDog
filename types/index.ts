// Re-export all types
export * from './database.types'

// Additional app-level types

// =====================================================
// RBAC Role Types
// =====================================================

/**
 * User roles in order of hierarchy (highest to lowest access)
 * 
 * super_admin (200): Full access, superuser bypass
 * admin (100): Full access to all features
 * manager (80): HR + Marketing + Recruiting + Schedules + Education
 * hr_admin (60): HR + Recruiting + Schedules + Education
 * sup_admin (55): Supervisor - HR + Recruiting + Schedules
 * office_admin (50): Roster, Schedules, Time Off, Med Ops
 * marketing_admin (40): Marketing + GDU + Schedules (view only)
 * user (10): Dashboard, Own Profile, Own Schedule, Med Ops
 */
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'hr_admin' | 'sup_admin' | 'office_admin' | 'marketing_admin' | 'user'

/**
 * Role hierarchy levels for access comparison
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 200,
  admin: 100,
  manager: 80,
  hr_admin: 60,
  sup_admin: 55,
  office_admin: 50,
  marketing_admin: 40,
  user: 10
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: '👑 Master Admin',
  admin: '⭐ System Admin',
  manager: '👔 Manager',
  hr_admin: '👥 HR Admin',
  sup_admin: '🧑‍💼 Supervisor',
  office_admin: '🏢 Office Admin',
  marketing_admin: '📣 Marketing Admin',
  user: 'Team Member'
}

/**
 * Section access matrix - which roles can access which sections
 * NOTE: This controls sidebar visibility. Database page_access controls page-level access.
 */
export const SECTION_ACCESS: Record<string, UserRole[]> = {
  // HR Section (employee profiles, skills, reviews, scheduling)
  hr: ['super_admin', 'admin', 'manager', 'hr_admin'],
  
  // Recruiting Section (candidates, pipelines)
  recruiting: ['super_admin', 'admin', 'manager', 'hr_admin'],
  
  // Marketing Section (CRM, campaigns, leads)
  marketing: ['super_admin', 'admin', 'manager', 'marketing_admin'],
  
  // GDU/Education Section
  education: ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin'],
  
  // Schedule Management (create/edit) - same as HR
  schedules_manage: ['super_admin', 'admin', 'manager', 'hr_admin'],
  
  // Schedule View (read-only) - personal schedule only for regular users
  schedules_view: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Admin Settings
  admin: ['super_admin', 'admin'],
  
  // Med Ops (everyone has access)
  med_ops: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'],
}

export interface NavItem {
  title: string
  icon: string
  to: string
  requiresAdmin?: boolean
  requiredRoles?: UserRole[]
}

export interface BreadcrumbItem {
  title: string
  to?: string
  disabled?: boolean
}

export interface TableColumn<T = unknown> {
  key: keyof T | string
  title: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: string | number
}

export interface PaginationState {
  page: number
  itemsPerPage: number
  sortBy: string[]
  sortDesc: boolean[]
}

export interface FilterState {
  search: string
  department?: string
  role?: string
  isActive?: boolean
}

// Form validation
export type ValidationRule = (value: unknown) => boolean | string

export interface FormField {
  key: string
  label: string
  type: 'text' | 'email' | 'password' | 'select' | 'date' | 'number' | 'textarea'
  rules?: ValidationRule[]
  options?: { value: string | number; title: string }[]
  placeholder?: string
  hint?: string
  required?: boolean
}

// Toast/Snackbar notifications
export interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

// Calendar/Schedule types
export interface CalendarDay {
  date: string
  isToday: boolean
  isCurrentMonth: boolean
  schedules: import('./database.types').Schedule[]
}

export interface CalendarWeek {
  days: CalendarDay[]
}

// Dashboard stats
export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  pendingTimeOffRequests: number
  scheduledToday: number
  upcomingBirthdays: number
  recentLeads: number
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
