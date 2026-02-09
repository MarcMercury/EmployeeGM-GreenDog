// Re-export all types
export * from './database.types'

// =====================================================
// RBAC Role Types — Re-exported from app/types/index.ts
// (single source of truth for role definitions)
// =====================================================
export { ROLE_HIERARCHY, ROLE_DISPLAY_NAMES, SECTION_ACCESS } from '../app/types'
export type { UserRole, SectionPermissions, RolePermissions, RoleDefinition } from '../app/types'

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
