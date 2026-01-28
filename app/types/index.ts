// Re-export all types
export * from './database.types'

// =====================================================
// ROLE-BASED ACCESS CONTROL TYPES
// =====================================================

// User roles in order of access level (highest to lowest)
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'hr_admin' | 'sup_admin' | 'office_admin' | 'marketing_admin' | 'user'

// Role hierarchy for access checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 200,
  admin: 100,
  manager: 80,
  hr_admin: 60,
  sup_admin: 55,  // Supervisor - between hr_admin and office_admin
  office_admin: 50,
  marketing_admin: 40,
  user: 10
}

// Display names for roles
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  hr_admin: 'HR Admin',
  sup_admin: 'Supervisor',
  office_admin: 'Office Admin',
  marketing_admin: 'Marketing Admin',
  user: 'User'
}

// Section access matrix - defines which roles can access each section
// NOTE: This controls sidebar visibility. Database page_access controls page-level access.
// IMPORTANT: Must match the Access Matrix documented in docs/ACCESS_MATRIX_COMPREHENSIVE_REVIEW.md
export const SECTION_ACCESS: Record<string, UserRole[]> = {
  // HR/Management: Full access for most management roles, view for marketing_admin and user
  hr: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Recruiting: HR-focused roles only - NOT marketing_admin or user
  recruiting: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin'],
  
  // Marketing: Marketing-focused roles. office_admin has limited view (calendar/resources), user has limited view
  marketing: ['super_admin', 'admin', 'manager', 'marketing_admin', 'office_admin', 'user'],
  
  // Marketing Full: Only roles that can edit/manage marketing content
  marketing_full: ['super_admin', 'admin', 'manager', 'marketing_admin'],
  
  // CRM & Analytics: Marketing analytics - NOT hr_admin, office_admin, or user
  crm: ['super_admin', 'admin', 'manager', 'marketing_admin'],
  
  // GDU/Education: Education-focused roles - NOT office_admin or user
  education: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin'],
  
  // Schedule Management: Create/edit schedules
  schedules_manage: ['super_admin', 'admin', 'manager', 'sup_admin', 'office_admin'],
  
  // Schedule View: All users can view schedules
  schedules_view: ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'],
  
  // Admin Operations: Only admin roles
  admin: ['super_admin', 'admin']
}

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

// Helper to check if role is admin-level (super_admin or admin)
export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin'
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
