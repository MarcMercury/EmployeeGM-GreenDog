/**
 * GDU (Green Dog University) Type Definitions
 *
 * Consolidated interfaces for GDU pages and components.
 *
 * Source files:
 *   - app/pages/gdu/events/index.vue (CEEvent)
 *   - app/pages/gdu/events/new.vue (GDUInventoryItem, SelectedInventoryItem)
 *   - app/pages/gdu/students.vue (StudentEnrollment, GDULocation, GDUEmployee)
 *   - app/pages/gdu/visitors.vue (Visitor)
 *   - app/components/gdu/VisitorUploadWizard.vue (VisitorInsert)
 *   - app/components/gdu/StudentUploadWizard.vue (ParsedStudent)
 */

/* ------------------------------------------------------------------ */
/** @section CE Events */
/* ------------------------------------------------------------------ */

export interface CEEvent {
  id: string
  title: string
  description: string | null
  event_date_start: string
  event_date_end: string | null
  location_name: string | null
  format: string
  status: string
  ce_hours_offered: number
  speaker_name: string | null
  race_provider_status: string
  race_course_number: string | null
  max_attendees: number | null
  current_attendees: number
  created_at: string
  task_stats?: {
    total: number
    completed: number
  }
}

/* ------------------------------------------------------------------ */
/** @section Event Inventory */
/* ------------------------------------------------------------------ */

export interface GDUInventoryItem {
  id: string
  item_name: string
  category: string
  total_quantity: number
}

export interface SelectedInventoryItem {
  inventory_item_id: string
  item_name: string
  quantity_used: number
  location: string
}

/* ------------------------------------------------------------------ */
/** @section Students */
/* ------------------------------------------------------------------ */

export interface StudentEnrollment {
  enrollment_id: string
  person_id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  display_name: string
  email: string
  phone_mobile: string | null
  avatar_url: string | null
  lifecycle_stage: string
  program_type: string
  enrollment_status: string
  program_name: string | null
  cohort_identifier: string | null
  start_date: string | null
  end_date: string | null
  expected_graduation_date: string | null
  school_of_origin: string | null
  school_program: string | null
  assigned_location_id: string | null
  location_name: string | null
  assigned_mentor_id: string | null
  mentor_name: string | null
  coordinator_name: string | null
  schedule_type: string | null
  scheduled_hours_per_week: number | null
  is_paid: boolean
  stipend_amount: number | null
  hours_completed: number | null
  hours_required: number | null
  completion_percentage: number | null
  overall_performance_rating: string | null
  eligible_for_employment: boolean | null
  employment_interest_level: string | null
  converted_to_employee: boolean
  time_status: string
  created_at: string
  updated_at: string
}

export interface ParsedStudent {
  first_name: string
  last_name: string
  email: string
  phone_mobile: string | null
  program_type: string
  enrollment_status: string
  program_name: string | null
  cohort_identifier: string | null
  school_of_origin: string | null
  start_date: string | null
  end_date: string | null
}

/* ------------------------------------------------------------------ */
/** @section Visitors */
/* ------------------------------------------------------------------ */

export interface Visitor {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  visitor_type: string
  organization_name: string | null
  school_of_origin: string | null
  program_name: string | null
  visit_start_date: string | null
  visit_end_date: string | null
  lead_source: string | null
  referral_name: string | null
  notes: string | null
  is_active: boolean
  ce_event_id: string | null
  created_at: string
  coordinator: string | null
  first_greeter: string | null
  mentor: string | null
  location: string | null
  visit_status: string | null
  recruitment_announced: boolean
  recruitment_channel: string | null
  file_link: string | null
  reason_for_visit: string | null
}

export interface VisitorInsert {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  visitor_type?: 'intern' | 'extern' | 'student' | 'ce_attendee' | 'shadow' | 'other'
  organization_name?: string | null
  school_of_origin?: string | null
  program_name?: string | null
  visit_start_date?: string | null
  visit_end_date?: string | null
  location?: string | null
  visit_status?: string | null
  coordinator?: string | null
  mentor?: string | null
  notes?: string | null
  is_active?: boolean
}

/* ------------------------------------------------------------------ */
/** @section Shared GDU Lookups */
/* ------------------------------------------------------------------ */

export interface GDULocation {
  id: string
  name: string
}

export interface GDUEmployee {
  id: string
  first_name: string
  last_name: string
}
