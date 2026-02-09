/**
 * Operations & Payroll Types
 * ==========================
 * Consolidated type definitions for scheduling, time tracking,
 * payroll, attendance, and employee sync operations.
 *
 * Source files:
 *   - app/stores/operations.ts (Shift, TimePunch, TimeEntry, TimeOffRequest, TimeOffType, ShiftChange, Geofence, ConflictResult)
 *   - app/stores/payroll.ts (PayrollEmployee, PayrollTimeEntry, PayrollAdjustment, PayrollSignoff, PayrollStats)
 *   - app/components/operations/TimeClock.vue (AllowedLocation)
 *   - app/composables/useAttendance.ts (AttendanceBreakdown)
 *   - app/composables/useEmployeeSync.ts (EmployeeUpdateData, ProfileUpdateData, CompensationUpdateData, SyncResult)
 *
 * Note: AttendanceRecord, AttendanceBreakdownStats, AttendanceDetailRecord,
 * and AttendanceStatus are defined in app/types/index.ts and are NOT duplicated here.
 */

// =====================================================
// SCHEDULING
// =====================================================

export interface Shift {
  id: string
  employee_id: string | null
  location_id: string | null
  department_id: string | null
  start_at: string
  end_at: string
  status: 'draft' | 'published' | 'completed' | 'missed' | 'cancelled'
  is_open_shift: boolean
  published_at: string | null
  created_by_employee_id: string | null
  created_at: string
  updated_at: string
  /** Joined data */
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }
  } | null
  location?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

export interface ShiftChange {
  id: string
  shift_id: string
  from_employee_id: string | null
  to_employee_id: string | null
  type: string | null
  status: string
  requested_at: string
  resolved_at: string | null
  manager_employee_id: string | null
  manager_comment: string | null
  created_at: string
  /** Joined data */
  shift?: Shift | null
  from_employee?: { id: string; profile: { first_name: string | null; last_name: string | null } } | null
  to_employee?: { id: string; profile: { first_name: string | null; last_name: string | null } } | null
}

export interface ConflictResult {
  hasConflict: boolean
  type: 'time_off' | 'overlap' | null
  message: string | null
  details?: TimeOffRequest | Shift | null
}

// =====================================================
// TIME TRACKING
// =====================================================

export interface TimePunch {
  id: string
  employee_id: string
  punch_type: 'in' | 'out'
  punched_at: string
  clock_device_id: string | null
  latitude: number | null
  longitude: number | null
  geo_accuracy_meters: number | null
  geofence_id: string | null
  within_geofence: boolean | null
  violation_reason: string | null
  source: string | null
  notes: string | null
  created_at: string
}

/** Operations time entry — full record with approval workflow */
export interface TimeEntry {
  id: string
  employee_id: string
  shift_id: string | null
  clock_in_at: string | null
  clock_out_at: string | null
  total_hours: number | null
  is_approved: boolean
  approved_by_employee_id: string | null
  approved_at: string | null
  correction_reason: string | null
  created_at: string
  updated_at: string
  /** Joined data */
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }
  } | null
  shift?: Shift | null
}

/** Payroll-specific time entry — includes original punches and issue tracking */
export interface PayrollTimeEntry {
  entry_id: string
  shift_id: string | null
  entry_date: string
  clock_in_at: string
  clock_out_at: string | null
  original_clock_in: string
  original_clock_out: string | null
  total_hours: number | null
  is_corrected: boolean
  correction_reason: string | null
  has_issue: boolean
  issue_type: 'missing_clock_out' | 'missing_hours' | 'negative_hours' | null
}

// =====================================================
// TIME OFF
// =====================================================

export interface TimeOffRequest {
  id: string
  employee_id: string
  time_off_type_id: string
  start_date: string
  end_date: string
  duration_hours: number | null
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  requested_at: string
  approved_by_employee_id: string | null
  approved_at: string | null
  manager_comment: string | null
  created_at: string
  updated_at: string
  /** Joined data */
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
    }
  } | null
  time_off_type?: { id: string; name: string; is_paid: boolean } | null
}

export interface TimeOffType {
  id: string
  name: string
  code: string | null
  is_paid: boolean
  default_hours_per_day: number | null
}

// =====================================================
// GEOFENCING
// =====================================================

export interface Geofence {
  id: string
  name: string
  location_id: string | null
  latitude: number | null
  longitude: number | null
  radius_meters: number
  is_active: boolean
}

export interface AllowedLocation {
  id: string
  name: string
  address: string
}

// =====================================================
// PAYROLL
// =====================================================

export interface PayrollEmployee {
  employee_id: string
  employee_name: string
  department_name: string | null
  pay_rate: number
  pay_type: 'Hourly' | 'Salary'
  regular_hours: number
  overtime_hours: number
  double_time_hours: number
  pto_hours: number
  adjustments_total: number
  gross_pay_estimate: number
  status: 'pending' | 'approved' | 'disputed' | 'needs_review'
  has_issues: boolean
  issue_details: string | null
}

export interface PayrollAdjustment {
  id: string
  employee_id: string
  pay_period_start: string
  pay_period_end: string
  type: 'bonus' | 'reimbursement' | 'commission' | 'deduction' | 'pto_payout' | 'holiday_pay' | 'other'
  amount: number
  note: string | null
  created_by: string | null
  created_at: string
}

export interface PayrollSignoff {
  id: string
  employee_id: string
  pay_period_start: string
  pay_period_end: string
  status: 'pending' | 'approved' | 'disputed' | 'needs_review'
  regular_hours: number
  overtime_hours: number
  double_time_hours: number
  pto_hours: number
  total_adjustments: number
  gross_pay_estimate: number
  has_missing_punches: boolean
  has_negative_hours: boolean
  requires_attention: boolean
  attention_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  approved_by: string | null
  approved_at: string | null
  reviewer_notes: string | null
}

export interface PayrollStats {
  totalPayroll: number
  pendingReviews: number
  approvedCount: number
  missingPunches: number
  totalEmployees: number
  totalRegularHours: number
  totalOvertimeHours: number
  totalPTOHours: number
}

// =====================================================
// ATTENDANCE (supplemental — see also app/types/index.ts)
// =====================================================

/** Per-status breakdown row used in attendance composable */
export interface AttendanceBreakdown {
  status: string
  count: number
  penalty_sum: number
}

// =====================================================
// EMPLOYEE SYNC
// =====================================================

export interface EmployeeUpdateData {
  /** Basic Info */
  first_name?: string
  last_name?: string
  preferred_name?: string
  employee_number?: string

  /** Contact */
  email_work?: string
  email_personal?: string
  phone_work?: string
  phone_mobile?: string

  /** Address */
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string

  /** Emergency Contact */
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string

  /** Employment */
  department_id?: string | null
  position_id?: string | null
  location_id?: string | null
  manager_employee_id?: string | null
  employment_type?: string
  employment_status?: string
  hire_date?: string | null
  termination_date?: string | null
  date_of_birth?: string | null
  notes_internal?: string

  /** Slack */
  slack_user_id?: string | null
  slack_username?: string | null
  slack_avatar_url?: string | null
}

export interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  bio?: string
  avatar_url?: string
  role?: string
  is_active?: boolean
}

export interface CompensationUpdateData {
  pay_type?: string
  pay_rate?: number
  employment_status?: string
  benefits_enrolled?: boolean
  bonus_plan_details?: string
  ce_budget_total?: number
  ce_budget_used?: number
  effective_date?: string
}

export interface SyncResult {
  success: boolean
  error?: string
  updatedTables: string[]
}
