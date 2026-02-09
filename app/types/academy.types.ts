// =====================================================
// Academy Types — Consolidated shared interfaces
// =====================================================

/** @section Training Courses & Lessons */

export interface TrainingCourse {
  id: string
  code: string | null
  title: string
  description: string | null
  category: string | null
  estimated_hours: number | null
  is_required_for_role: boolean
  required_for_position_ids: string[] | null
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
  // Computed/joined
  lessons_count?: number
  enrollment?: TrainingEnrollment | null
  progress_percent?: number
}

export interface TrainingLesson {
  id: string
  course_id: string
  title: string
  content: string | null
  video_url: string | null
  file_id: string | null
  position: number
  created_at: string
  updated_at: string
  // Computed/joined
  progress?: TrainingProgress | null
  quiz?: TrainingQuiz | null
}

export interface CourseWithSkill extends TrainingCourse {
  skill_id?: string | null
  skill_level_awarded?: number | null
  skill_name?: string
  skill?: { name: string } | null
}

/** @section Enrollment & Progress */

export interface TrainingEnrollment {
  id: string
  employee_id: string
  course_id: string
  enrolled_at: string
  due_date: string | null
  status: 'enrolled' | 'in_progress' | 'completed' | 'expired' | 'dropped'
  created_at: string
  updated_at: string
}

export interface TrainingProgress {
  id: string
  employee_id: string
  lesson_id: string
  started_at: string | null
  completed_at: string | null
  progress_percent: number
  created_at: string
  updated_at: string
}

/** @section Quizzes */

export interface TrainingQuiz {
  id: string
  course_id: string | null
  lesson_id: string | null
  title: string
  instructions: string | null
  passing_score: number
  created_at: string
  updated_at: string
}

export interface TrainingQuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_type: 'multiple_choice' | 'multi_select' | 'true_false'
  options: { id: string; text: string }[]
  correct_answer: string | string[]
  position: number
  created_at: string
}

export interface TrainingQuizAttempt {
  id: string
  quiz_id: string
  employee_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  passed: boolean | null
  answers: Record<string, string | string[]>
  created_at: string
}

/** @section Certifications */

export interface Certification {
  id: string
  name: string
  code: string | null
  description: string | null
  issuing_authority: string | null
  validity_months: number | null
  is_required: boolean
  created_at: string
}

export interface EmployeeCertification {
  id: string
  employee_id: string
  certification_id: string
  certification_number: string | null
  issued_date: string | null
  expiration_date: string | null
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'renewal_pending'
  created_at: string
  // Joined
  certification?: Certification
}

/** @section Sign-offs */

export interface SignoffItem {
  enrollment_id: string
  course_id: string
  course_title: string
  skill_id: string | null
  skill_name: string | null
  skill_level_awarded: number | null
  employee_id: string
  employee_name: string
  completed_at: string
  progress_percent: number
  requires_signoff: boolean
  signoff_by: string | null
  signoff_at: string | null
  department: string | null
  manager_id: string | null
}
