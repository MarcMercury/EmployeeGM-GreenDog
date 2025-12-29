// Re-export all types
export * from './database.types'

// =====================================================
// ROLE-BASED ACCESS CONTROL TYPES
// =====================================================

// User roles in order of access level (highest to lowest)
export type UserRole = 'admin' | 'office_admin' | 'marketing_admin' | 'user'

// Permission structure for each section
export interface SectionPermissions {
  view: boolean
  edit: boolean
  [key: string]: boolean  // Additional granular permissions
}

export interface RolePermissions {
  my_workspace: SectionPermissions
  management: SectionPermissions & {
    roster?: boolean
    schedule?: boolean
    time_off?: boolean
    recruiting?: boolean
    skills?: boolean
  }
  med_ops: SectionPermissions
  marketing: SectionPermissions & {
    events?: boolean
    leads?: boolean
    inventory?: boolean
  }
  gdu: SectionPermissions & {
    visitors?: boolean
    events?: boolean
  }
  admin_ops: SectionPermissions & {
    settings?: boolean
    payroll?: boolean
    master_roster?: boolean
  }
}

export interface RoleDefinition {
  role_key: UserRole
  display_name: string
  description: string
  tier: number
  permissions: RolePermissions
  icon: string
  color: string
}

// Role hierarchy for access checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  office_admin: 50,
  marketing_admin: 40,
  user: 10
}

// Additional app-level types

export interface NavItem {
  title: string
  icon: string
  to: string
  requiresAdmin?: boolean
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

// =====================================================
// ATTENDANCE TYPES
// =====================================================

export type AttendanceStatus = 
  | 'present' 
  | 'late' 
  | 'excused_late' 
  | 'absent' 
  | 'excused_absent' 
  | 'no_show'

export interface AttendanceRecord {
  id: string
  employee_id: string
  shift_id: string | null
  shift_date: string
  scheduled_start: string | null
  actual_start: string | null
  status: AttendanceStatus
  minutes_late: number
  excused_at: string | null
  excused_by_employee_id: string | null
  excuse_reason: string | null
  notes: string | null
  penalty_weight: number
  created_at: string
  updated_at: string
}

export interface AttendanceBreakdownStats {
  present: number
  late: number
  excused_late: number
  absent: number
  excused_absent: number
  no_show: number
  total: number
  reliabilityScore: number
}

export interface AttendanceDetailRecord {
  id: string
  shift_date: string
  scheduled_start: string | null
  actual_start: string | null
  minutes_late: number
  notes: string | null
  excuse_reason: string | null
  excused_at: string | null
  excused_by_name: string | null
}

// Penalty weights for attendance scoring
export const ATTENDANCE_PENALTY_WEIGHTS: Record<AttendanceStatus, number> = {
  present: 0.0,
  late: 1.0,
  excused_late: 0.25,
  absent: 1.0,
  excused_absent: 0.25,
  no_show: 1.0
}
