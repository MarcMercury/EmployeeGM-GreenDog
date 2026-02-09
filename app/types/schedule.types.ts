/**
 * Consolidated Schedule Types
 *
 * Single source of truth for all schedule-related interfaces used across
 * the schedule builder, wizard, dashboard, templates, validation, and AI features.
 *
 * Previously duplicated in:
 *   - app/pages/schedule/builder.vue
 *   - app/pages/schedule/wizard.vue
 *   - app/pages/schedule/index.vue
 *   - app/pages/schedule/services.vue
 *   - app/stores/scheduleBuilder.ts
 *   - app/components/schedule/AISuggestDialog.vue
 *   - app/components/schedule/TemplateDialogs.vue
 *   - app/components/schedule/PublishDialog.vue
 *   - app/components/schedule/WizardTemplatesManager.vue
 *   - app/components/schedule/WizardEmployeeSelector.vue
 *   - app/composables/useScheduleRules.ts
 *   - app/composables/useScheduleValidation.ts
 *   - app/pages/admin/scheduling-rules.vue
 */

// ---------------------------------------------------------------------------
/** @section Core Schedule Types */
// ---------------------------------------------------------------------------

/** A single schedule shift (from the database / conflict engine). */
export interface ScheduleShift {
  id: string
  start_at: string
  end_at: string
  location_id: string
  location_name?: string
  employee_id: string | null
  role_required?: string
  status:
    | 'draft'
    | 'published'
    | 'completed'
    | 'missed'
    | 'cancelled'
    | 'open'
    | 'filled'
    | 'closed_clinic'
  is_published: boolean
  is_open_shift: boolean
}

/** Extended shift with an optimistic-locking version field. */
export interface ShiftWithVersion extends ScheduleShift {
  version?: number
  /** Marks a draft shift that has not yet been persisted to the database. */
  is_new?: boolean
}

/** A schedule week record that tracks publish/status metadata. */
export interface ScheduleWeek {
  id: string
  location_id: string
  week_start: string
  status: 'draft' | 'review' | 'published' | 'locked'
  published_at: string | null
  published_by: string | null
  total_shifts: number
  filled_shifts: number
}

/** A schedule draft entry (index page). */
export interface ScheduleDraft {
  id: string
  location_id: string
  week_start: string
  status: string
  published_at?: string
}

/** A row in the builder shift grid, built from services + staffing requirements. */
export interface ShiftRow {
  id: string
  service_id: string
  staffing_requirement_id: string | null
  role_label: string
  role_category: string
  start_time: string
  end_time: string
  raw_shift: string
  color: string
  isBreak?: boolean
  service_code?: string
}

/** An employee record used in the schedule context. */
export interface ScheduleEmployee {
  id: string
  first_name: string
  last_name: string
  full_name: string
  initials: string
  avatar_url?: string | null
  position?: {
    id: string
    title: string
  } | null
  hoursScheduled?: number
  targetHours?: number
  reliabilityScore?: number
}

// ---------------------------------------------------------------------------
/** @section Template Types */
// ---------------------------------------------------------------------------

/**
 * Schedule template — the most complete version combining fields from both
 * TemplateDialogs.vue and WizardTemplatesManager.vue.
 */
export interface ScheduleTemplate {
  id: string
  name: string
  description: string | null
  location_id: string | null
  location_name: string | null
  operational_days: number[]
  service_count: number
  slot_count: number
  shift_count: number
  is_default: boolean
  usage_count: number
  last_used_at: string | null
  created_by_name: string | null
  created_at: string
}

/** Default shift template with start/end times and optional role. */
export interface ShiftTemplate {
  start_time: string
  end_time: string
  role_required: string | null
}

// ---------------------------------------------------------------------------
/** @section Draft / Wizard Types */
// ---------------------------------------------------------------------------

/**
 * A single slot within a schedule draft (wizard flow).
 * Most complete version from WizardEmployeeSelector + wizard.vue.
 */
export interface DraftSlot {
  id: string
  draft_id: string
  service_id: string
  staffing_requirement_id: string | null
  role_category: string
  role_label: string
  is_required: boolean
  priority: number
  slot_date: string
  start_time: string
  end_time: string
  employee_id: string | null
  is_filled: boolean
  has_conflict: boolean
  conflict_reason: string | null
  ai_suggested_employee_id: string | null
  ai_confidence: number | null
  service?: {
    id: string
    name: string
    code: string
    color: string
    icon: string
  }
  employee?: { first_name: string; last_name: string }
}

/** An employee option surfaced during draft slot assignment. */
export interface AvailableEmployee {
  employee_id: string
  first_name: string
  last_name: string
  position_title: string
  is_available: boolean
  conflict_reason: string | null
  current_week_hours: number
  reliability_score: number
  availability_type: string
  availability_note: string | null
  preference_level: number
}

// ---------------------------------------------------------------------------
/** @section Validation Types */
// ---------------------------------------------------------------------------

/** A single rule violation produced by schedule validation. */
export interface ValidationViolation {
  rule: string
  type: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

/**
 * Result of validating a single shift assignment
 * (from useScheduleValidation).
 */
export interface ShiftValidationResult {
  isValid: boolean
  violations: ValidationViolation[]
  hasErrors: boolean
  hasWarnings: boolean
  weeklyHours: number
}

/**
 * Lightweight validation result from the schedule-rules conflict engine
 * (from useScheduleRules).
 */
export interface RuleValidationResult {
  valid: boolean
  type: 'success' | 'warning' | 'error'
  message: string | null
  conflictShiftId?: string
}

/**
 * Wizard-level validation result covering the entire draft
 * (from wizard.vue).
 */
export interface WizardValidationResult {
  errors: Array<{
    type: string
    severity: string
    message: string
    date?: string
  }>
  warnings: Array<{
    type: string
    severity: string
    message: string
  }>
  coverage_score: number
  total_slots: number
  filled_slots: number
  required_unfilled: number
  is_valid: boolean
}

/** Per-employee hours summary used for overtime indicators. */
export interface EmployeeHoursSummary {
  employeeId: string
  firstName: string
  lastName: string
  scheduledHours: number
  isOvertime: boolean
  isApproachingOvertime: boolean
  shiftCount: number
}

// ---------------------------------------------------------------------------
/** @section AI Suggestion Types */
// ---------------------------------------------------------------------------

/** A single AI-suggested shift assignment. */
export interface AISuggestedShift {
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  role: string
  confidence: number
  reasoning: string
  selected: boolean
}

/** Full result payload returned by the AI schedule-suggest endpoint. */
export interface AISuggestionResult {
  shifts: AISuggestedShift[]
  coverage: Array<{
    date: string
    filled: number
    required: number
    status: string
  }>
  warnings: string[]
  summary: string
}

// ---------------------------------------------------------------------------
/** @section Staffing Types */
// ---------------------------------------------------------------------------

/**
 * A clinic service (e.g. Surgery, Urgent Care).
 * Most complete version combining builder, wizard, and services page fields.
 */
export interface Service {
  id: string
  name: string
  code: string
  color: string
  icon?: string
  description?: string | null
  requires_dvm?: boolean
  min_staff_count?: number
  is_active?: boolean
  sort_order: number
}

/** Per-service staffing requirement defining role counts and priorities. */
export interface StaffingRequirement {
  id: string
  service_id: string
  role_category: string
  role_label: string
  min_count: number
  max_count: number | null
  is_required: boolean
  priority: number
  sort_order: number
}

/** Admin-managed scheduling rule (constraints enforced during validation). */
export interface SchedulingRule {
  id: string
  name: string
  description: string | null
  rule_type: string
  parameters: Record<string, any>
  location_id: string | null
  department_id: string | null
  position_id: string | null
  is_active: boolean
  severity: 'error' | 'warning' | 'info'
  created_at: string
  updated_at: string
  location?: { id: string; name: string }
  department?: { id: string; name: string }
  position?: { id: string; title: string }
}

// ---------------------------------------------------------------------------
/** @section Dashboard Types */
// ---------------------------------------------------------------------------

/** Per-location summary shown on the wizard dashboard. */
export interface DashboardLocation {
  location_id: string
  location_name: string
  location_code: string
  draft_id: string | null
  draft_status: string
  total_slots: number
  filled_slots: number
  required_slots: number
  required_filled: number
  coverage_percentage: number
  has_draft: boolean
  published_at: string | null
  last_updated: string | null
}

/** Minimal location record used on the schedule index page. */
export interface ScheduleLocation {
  id: string
  name: string
  code?: string
}

// ---------------------------------------------------------------------------
/** @section Time Off Types */
// ---------------------------------------------------------------------------

/** An employee time-off request relevant to schedule conflict checks. */
export interface ScheduleTimeOffRequest {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  employees?: { first_name: string; last_name: string }
}

// ---------------------------------------------------------------------------
/** @section Store Types */
// ---------------------------------------------------------------------------

/** State shape for the scheduleBuilder Pinia store. */
export interface ScheduleBuilderState {
  draftShifts: ShiftWithVersion[]
  dbShifts: ShiftWithVersion[]
  selectedWeekStart: string
  isLoading: boolean
  isSaving: boolean
  isPublishing: boolean
  error: string | null
  versionConflicts: Array<{ shiftId: string; serverVersion: number }>
  realtimeChannel: any | null
  defaultShiftTemplates: ShiftTemplate[]
}
