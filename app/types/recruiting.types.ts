/**
 * Consolidated recruiting/onboarding-related interfaces.
 *
 * Source files:
 *   - app/pages/recruiting/candidates.vue
 *   - app/pages/recruiting/index.vue
 *   - app/pages/recruiting/interviews.vue
 *   - app/pages/recruiting/shadow/[id].vue
 *   - app/pages/recruiting/onboarding/index.vue
 *   - app/pages/recruiting/onboarding/[id].vue
 *   - app/pages/recruiting/onboarding.vue
 *   - app/components/recruiting/InterviewDialog.vue
 */

// ---------------------------------------------------------------------------
// Candidate types
// ---------------------------------------------------------------------------

/**
 * Unified Candidate interface — merged from 6 files.
 * Base fields from candidates.vue (most complete), with additional optional
 * fields from index.vue, onboarding.vue, and onboarding/index.vue.
 */
export interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  status: string
  applied_at?: string
  notes?: string | null
  target_position_id?: string | null
  job_positions?: { title: string } | null
  location_id?: string | null
  location?: { name: string } | null
  department_id?: string | null
  department?: { name: string } | null
  resume_url?: string | null
  source?: string | null
  referral_source?: string | null
  experience_years?: number | null
  interview_status?: string | null
  candidate_type?: string | null
  /** Present in onboarding-related views */
  onboarding_complete?: boolean
  /** Inline skill ratings used by the pipeline / index view */
  candidate_skills?: { rating: number }[]
  /** Nested checklist record used by onboarding views */
  onboarding_checklist?: OnboardingChecklist
}

/**
 * A single interview record attached to a candidate (view-layer variant with
 * joined interviewer name and looser field types).
 * The stricter DB-level CandidateInterview lives in database.types.ts.
 * Source: candidates.vue
 */
export interface CandidateInterviewView {
  id: string
  candidate_id: string
  interview_type: string
  scheduled_at: string | null
  interviewer_employee_id: string | null
  interviewer?: { first_name: string; last_name: string } | null
  duration_minutes: number | null
  overall_score: number | null
  technical_score: number | null
  communication_score: number | null
  cultural_fit_score: number | null
  notes: string | null
  strengths: string | null
  concerns: string | null
  recommendation: string | null
  status: string
  round_number: number
  created_at: string
}

/**
 * Skill association for a candidate — merged from candidates.vue and shadow/[id].vue.
 * candidates.vue uses candidate_id/skill_id/rating; shadow uses skill_level/skill_library.
 */
export interface CandidateSkill {
  id: string
  candidate_id?: string
  skill_id?: string
  rating?: number
  /** Used in shadow view */
  skill_level?: number
  /** Populated join from skill_library table (shadow view) */
  skill_library?: { name: string; category: string }
}

// ---------------------------------------------------------------------------
// Interview types
// ---------------------------------------------------------------------------

/**
 * Lightweight interview row used by the interviews list page.
 * Source: interviews.vue
 */
export interface Interview {
  id: string
  candidate_id: string
  interview_type: string
  scheduled_at: string | null
  created_at: string
  status: string
  candidate?: {
    first_name: string
    last_name: string
  }
}

/**
 * Form payload for creating / editing an interview.
 * Source: InterviewDialog.vue
 */
export interface InterviewForm {
  interview_type: string
  scheduled_at: string
  interviewer_employee_id: string | null
  duration_minutes: number
  location: string
  video_link: string
  overall_score: number
  technical_score: number
  communication_score: number
  cultural_fit_score: number
  notes: string
  strengths: string
  concerns: string
  recommendation: string
  status: string
}

// ---------------------------------------------------------------------------
// Onboarding types
// ---------------------------------------------------------------------------

/**
 * Onboarding record with optional joined candidate / stage / progress info.
 * Source: onboarding/index.vue
 */
export interface OnboardingRecord {
  id: string
  candidate_id: string
  template_id: string
  current_stage_id: string
  status: string
  started_at: string
  completed_at: string | null
  target_start_date: string | null
  actual_start_date: string | null
  candidates?: Candidate & { job_positions?: { title: string } }
  current_stage?: { name: string; icon: string }
  total_tasks?: number
  completed_tasks?: number
}

/**
 * Legacy flat onboarding checklist (pre-template workflow).
 * Source: onboarding.vue
 */
export interface OnboardingChecklist {
  id: string
  candidate_id: string
  contract_sent: boolean
  contract_signed: boolean
  background_check: boolean
  uniform_ordered: boolean
  email_created: boolean
  start_date: string | null
}

/**
 * Full onboarding entity used by the detail page.
 * Source: onboarding/[id].vue
 */
export interface Onboarding {
  id: string
  candidate_id: string
  template_id: string
  current_stage_id: string
  status: string
  started_at: string
  completed_at: string | null
  assigned_to: string | null
  target_start_date: string | null
  actual_start_date: string | null
  notes: string | null
}

/**
 * A stage within an onboarding template.
 * Source: onboarding/[id].vue
 */
export interface Stage {
  id: string
  template_id: string
  name: string
  description: string
  icon: string
  sort_order: number
}

/**
 * A task within an onboarding process.
 * Source: onboarding/[id].vue
 */
export interface Task {
  id: string
  onboarding_id: string
  task_template_id: string
  stage_id: string
  name: string
  description: string
  task_type: string
  is_required: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  document_id: string | null
  notes: string | null
  sort_order: number
}

/**
 * An onboarding template definition.
 * Source: onboarding/index.vue
 */
export interface Template {
  id: string
  name: string
  description: string
  is_default: boolean
}

/**
 * An asset assigned during onboarding.
 * Source: onboarding/[id].vue
 */
export interface Asset {
  id: string
  asset_type: string
  asset_name: string
  serial_number: string | null
  condition: string
  notes: string | null
}

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * Skill library entry.
 * Source: candidates.vue
 */
// Skill is exported from app/types/skill.types.ts (has additional fields)
// Recruiting code can use that Skill type directly

/**
 * Employee reference used in recruiting context (interviewers, etc.).
 * Named RecruitingEmployee to avoid collision with the generic Employee type.
 * Source: candidates.vue, InterviewDialog.vue (identical definitions)
 */
export interface RecruitingEmployee {
  id: string
  full_name: string
  profile_id?: string
}
