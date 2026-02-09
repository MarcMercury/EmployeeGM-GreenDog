/**
 * Performance & Review Types
 * ==========================
 * Consolidated type definitions for goals, performance reviews,
 * review cycles, templates, and feedback.
 *
 * Source files:
 *   - app/stores/performance.ts (Goal, GoalUpdate, ReviewCycle, ReviewTemplate, ReviewQuestion, PerformanceReview, ReviewResponse, ReviewSignoff, Feedback)
 */

// =====================================================
// GOALS
// =====================================================

export interface Goal {
  id: string
  title: string
  description: string | null
  owner_employee_id: string | null
  aligns_to_goal_id: string | null
  visibility: 'private' | 'team' | 'company'
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold'
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  progress_percent: number
  metrics: Record<string, any> | null
  created_at: string
  updated_at: string
  /** Joined data */
  owner?: {
    id: string
    first_name: string
    last_name: string
  }
  updates?: GoalUpdate[]
}

export interface GoalUpdate {
  id: string
  goal_id: string
  employee_id: string | null
  comment: string | null
  progress_percent: number | null
  created_at: string
  /** Joined data */
  employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

// =====================================================
// REVIEW CYCLES & TEMPLATES
// =====================================================

export interface ReviewCycle {
  id: string
  name: string
  description: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  status: 'draft' | 'open' | 'in_review' | 'calibration' | 'closed'
  created_at: string
  updated_at: string
}

export interface ReviewTemplate {
  id: string
  name: string
  description: string | null
  form_schema: ReviewQuestion[]
  workflow_config: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface ReviewQuestion {
  key: string
  label: string
  type: 'text' | 'textarea' | 'rating' | 'select' | 'multiselect'
  required?: boolean
  options?: string[]
  helpText?: string
  section?: string
  forRoles?: ('employee' | 'manager')[]
}

// =====================================================
// PERFORMANCE REVIEWS
// =====================================================

export interface PerformanceReview {
  id: string
  review_cycle_id: string | null
  employee_id: string
  manager_employee_id: string | null
  template_id: string | null
  current_stage: 'self_review' | 'manager_review' | 'calibration' | 'delivery' | 'acknowledged' | null
  status: 'draft' | 'in_progress' | 'submitted' | 'completed' | 'cancelled'
  employee_submitted_at: string | null
  manager_submitted_at: string | null
  calibrated_rating: number | null
  overall_rating: number | null
  summary_comment: string | null
  created_at: string
  updated_at: string
  /** Joined data */
  employee?: {
    id: string
    first_name: string
    last_name: string
    position_title?: string
  }
  manager?: {
    id: string
    first_name: string
    last_name: string
  }
  cycle?: ReviewCycle
  template?: ReviewTemplate
  responses?: ReviewResponse[]
  signoffs?: ReviewSignoff[]
}

export interface ReviewResponse {
  id: string
  performance_review_id: string
  question_key: string | null
  responder_role: string | null
  responder_employee_id: string | null
  answer_text: string | null
  answer_value: number | null
  visibility: string
  created_at: string
  updated_at: string
}

export interface ReviewSignoff {
  id: string
  performance_review_id: string
  employee_id: string
  role: string | null
  signed_at: string | null
  comment: string | null
  created_at: string
  /** Joined data */
  employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

// =====================================================
// FEEDBACK
// =====================================================

export interface Feedback {
  id: string
  from_employee_id: string | null
  to_employee_id: string
  type: string | null
  is_public: boolean
  message: string | null
  context: Record<string, any> | null
  created_at: string
  /** Joined data */
  from_employee?: {
    id: string
    first_name: string
    last_name: string
  }
  to_employee?: {
    id: string
    first_name: string
    last_name: string
  }
}
