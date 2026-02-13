/**
 * Admin & Store Type Definitions
 *
 * Consolidated interfaces for admin pages, contact list, and Pinia stores.
 *
 * Source files:
 *   - app/pages/admin/users.vue (UserAccount, PendingEmployee)
 *   - app/components/admin/CreateUserDialog.vue (PendingEmployee — duplicate, merged)
 *   - app/pages/admin/email-templates.vue (EmailTemplate)
 *   - app/pages/admin/system-health.vue (EmailTemplate — duplicate, merged)
 *   - app/pages/contact-list.vue (ContactEmployee)
 *   - app/stores/user.ts (UserProfile, UserEmployee, UserData)
 *   - app/stores/dashboard.ts (StoreDashboardStats, TeamHealth, MentorshipMatch, GrowthStats, UpcomingShift)
 */

/* ------------------------------------------------------------------ */
/** @section User Accounts */
/* ------------------------------------------------------------------ */

export interface UserAccount {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  auth_user_id: string
  avatar_url: string | null
  phone: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  auth_email?: string
  email_confirmed?: boolean
  last_sign_in_at?: string
  is_banned?: boolean
}

export interface PendingEmployee {
  employee_id: string | null
  employee_number?: string
  first_name: string
  last_name: string
  display_name: string
  email_work: string
  email_personal?: string | null
  phone_mobile: string | null
  hire_date?: string
  employment_status?: string
  onboarding_status?: string
  needs_user_account?: boolean
  profile_id: string
  auth_user_id?: string | null
  has_auth?: boolean
  profile_role?: string
  position_title: string | null
  department_name?: string | null
  location_name: string | null
  status?: string
  start_date?: string | null
}

/* ------------------------------------------------------------------ */
/** @section Email Templates */
/* ------------------------------------------------------------------ */

export interface EmailTemplate {
  id: string
  name: string
  category: string
  icon?: string
  subject: string
  body: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/* ------------------------------------------------------------------ */
/** @section Master Roster */
/* ------------------------------------------------------------------ */

export interface RosterEmployee {
  id: string
  profile_id: string | null
  employee_number: string | null
  first_name: string
  last_name: string
  preferred_name: string | null
  full_name: string
  email_work: string | null
  email_personal: string | null
  phone_work: string | null
  phone_mobile: string | null
  department_id: string | null
  position_id: string | null
  manager_employee_id: string | null
  location_id: string | null
  employment_type: string | null
  employment_status: string | null
  hire_date: string | null
  termination_date: string | null
  date_of_birth: string | null
  notes_internal: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  department: { id: string; name: string } | null
  position: { id: string; title: string } | null
  location: { id: string; name: string } | null
  compensation: {
    id: string
    pay_type: string | null
    pay_rate: number | null
    employment_status: string | null
    benefits_enrolled: boolean
    ce_budget_total: number | null
    ce_budget_used: number | null
    effective_date: string | null
  } | null
  profile: {
    id: string
    role: string
    is_active: boolean
    email: string
    auth_user_id: string | null
  } | null
  time_off_balances: {
    id: string
    time_off_type_id: string
    accrued_hours: number
    used_hours: number
    pending_hours: number
    carryover_hours: number
    period_year: number
  }[] | null
}

export interface RosterDepartment {
  id: string
  name: string
}

export interface RosterPosition {
  id: string
  title: string
}

export interface RosterLocation {
  id: string
  name: string
}

/* ------------------------------------------------------------------ */
/** @section Contact List */
/* ------------------------------------------------------------------ */

export interface ContactEmployee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  position_title: string | null
  department_name: string | null
  manager_first_name: string | null
  manager_last_name: string | null
  phone: string | null
  employment_status: string
}

/* ------------------------------------------------------------------ */
/** @section User Store (Pinia) */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: string
  auth_user_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'super_admin' | 'admin' | 'manager' | 'hr_admin' | 'office_admin' | 'marketing_admin' | 'user'
  is_active: boolean
  bio: string | null
  created_at: string
  updated_at: string
}

export interface UserEmployee {
  id: string
  profile_id: string
  employee_number: string | null
  first_name: string
  last_name: string
  preferred_name: string | null
  email_work: string | null
  phone_mobile: string | null
  department_id: string | null
  position_id: string | null
  location_id: string | null
  manager_employee_id: string | null
  employment_type: string | null
  employment_status: string | null
  hire_date: string | null
  created_at: string
  updated_at: string
  department?: { id: string; name: string; code: string | null } | null
  position?: { id: string; title: string; code: string | null; is_manager: boolean } | null
  location?: { id: string; name: string; city: string | null } | null
}

export interface UserData {
  profile: UserProfile | null
  employee: UserEmployee | null
}

/* ------------------------------------------------------------------ */
/** @section Dashboard Store (Pinia) */
/* ------------------------------------------------------------------ */

/**
 * Named StoreDashboardStats to avoid collision with DashboardStats
 * in app/types/index.ts (which has different fields).
 */
export interface StoreDashboardStats {
  totalStaff: number
  onShiftToday: number
  pendingRequests: number
  activeMentorships: number
}

export interface TeamHealth {
  compliant: number
  expired: number
  percentage: number
}

export interface MentorshipMatch {
  id: string
  learnerName: string
  skillName: string
  mentorName: string
  status: string
}

export interface GrowthStats {
  leadsThisWeek: number
  weeklyGoal: number
  conversionRate: number
  upcomingEvents: number
}

export interface UpcomingShift {
  id: string
  date: string
  time: string
  employee: { name: string; initials: string } | null
  role: string
  location: string
}
