// Database Types for Employee GM - Green Dog Dental
// Auto-generated based on Supabase schema

export type UserRole = 'admin' | 'user'
export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5
export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'on_leave'
export type ShiftStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type MentorshipStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
export type TrainingStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'dropped'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type ReviewStatus = 'draft' | 'in_progress' | 'pending_approval' | 'completed' | 'cancelled'
export type FeedbackType = 'praise' | 'constructive' | 'general' | 'recognition'
export type PayType = 'hourly' | 'salary' | 'contract'
export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube'
export type ReferralTier = 'bronze' | 'silver' | 'gold' | 'platinum'

// =====================================================
// CORE & AUTH
// =====================================================

export interface Profile {
  id: string
  auth_user_id?: string | null
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  avatar_url: string | null
  bio?: string | null
  job_title?: string | null
  phone?: string | null
  is_active: boolean
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role?: UserRole
  avatar_url?: string | null
  bio?: string | null
  job_title?: string | null
}

export interface ProfileUpdate {
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  job_title?: string | null
  role?: UserRole
}

export interface CompanySetting {
  id: string
  setting_key: string
  setting_value: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  timestamp: string
}

// =====================================================
// ORG STRUCTURE
// =====================================================

export interface Department {
  id: string
  name: string
  code: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface JobPosition {
  id: string
  title: string
  description: string | null
  is_manager: boolean
  department_id: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  profile_id: string
  department_id: string | null
  position_id: string | null
  hire_date: string | null
  status: EmployeeStatus
  manager_id: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeWithProfile extends Employee {
  profile: Profile
  department?: Department | null
  position?: JobPosition | null
  manager?: Employee | null
}

export interface Team {
  id: string
  name: string
  description: string | null
  lead_id: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeTeam {
  id: string
  employee_id: string
  team_id: string
  role: string | null
  joined_at: string
}

// =====================================================
// SKILL ENGINE (MADDEN LOGIC)
// =====================================================

export interface Skill {
  id: string
  category: string
  name: string
  description: string | null
  max_level: number
  icon: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface UserSkill {
  id: string
  user_id: string
  skill_id: string
  rating: SkillLevel
  is_goal: boolean
  goal_rating: SkillLevel | null
  notes: string | null
  last_assessed_at: string | null
  created_at: string
  updated_at: string
}

export interface UserSkillWithDetails extends UserSkill {
  skill: Skill
}

export interface MentorshipRequest {
  id: string
  requester_id: string
  mentor_id: string
  skill_id: string
  status: MentorshipStatus
  message: string | null
  response_message: string | null
  created_at: string
  updated_at: string
}

// Helper function to categorize skill levels
export function getSkillCategory(level: SkillLevel): 'learning' | 'competent' | 'mentor' {
  if (level <= 2) return 'learning'
  if (level <= 4) return 'competent'
  return 'mentor'
}

export function getSkillColor(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return '#FF9800'
    case 'competent': return '#2196F3'
    case 'mentor': return '#4CAF50'
  }
}

// =====================================================
// TRAINING MODULE
// =====================================================

export interface TrainingCourse {
  id: string
  title: string
  description: string | null
  category: string | null
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null
  estimated_hours: number | null
  is_required: boolean
  is_active: boolean
  thumbnail_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingLesson {
  id: string
  course_id: string
  title: string
  content: string | null
  content_url: string | null
  content_type: 'video' | 'document' | 'interactive' | 'quiz' | null
  order_index: number
  duration_minutes: number | null
  created_at: string
  updated_at: string
}

export interface TrainingEnrollment {
  id: string
  employee_id: string
  course_id: string
  status: TrainingStatus
  enrolled_at: string
  started_at: string | null
  completed_at: string | null
  final_score: number | null
}

export interface TrainingProgress {
  id: string
  employee_id: string
  lesson_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percent: number
  started_at: string | null
  completed_at: string | null
}

export interface TrainingQuiz {
  id: string
  lesson_id: string
  title: string
  passing_score: number
  max_attempts: number | null
  time_limit_minutes: number | null
  created_at: string
}

export interface TrainingQuizQuestion {
  id: string
  quiz_id: string
  question: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  options: string[] | null
  correct_answer: string
  points: number
  order_index: number
}

export interface TrainingQuizAttempt {
  id: string
  quiz_id: string
  employee_id: string
  score: number
  max_score: number
  passed: boolean
  answers: Record<string, string> | null
  started_at: string
  completed_at: string | null
}

// =====================================================
// OPERATIONS & SCHEDULING
// =====================================================

export interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius: number
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  location_id: string
  date: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  published_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftTemplate {
  id: string
  name: string
  location_id: string | null
  start_time: string
  end_time: string
  color: string
  is_active: boolean
  created_at: string
}

export interface Shift {
  id: string
  schedule_id: string
  employee_id: string | null
  template_id: string | null
  start_time: string
  end_time: string
  break_duration: number
  status: ShiftStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftWithEmployee extends Shift {
  employee?: EmployeeWithProfile | null
}

export interface ShiftChange {
  id: string
  shift_id: string
  requesting_employee_id: string
  target_employee_id: string | null
  change_type: 'swap' | 'drop' | 'pickup' | 'cover'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface TimePunch {
  id: string
  employee_id: string
  shift_id: string | null
  punch_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
  timestamp: string
  latitude: number | null
  longitude: number | null
  location_id: string | null
  is_manual: boolean
  notes: string | null
  approved_by: string | null
}

export interface TimeEntry {
  id: string
  employee_id: string
  date: string
  regular_hours: number
  overtime_hours: number
  break_hours: number
  total_hours: number
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffType {
  id: string
  name: string
  description: string | null
  is_paid: boolean
  requires_approval: boolean
  max_days_per_year: number | null
  color: string
  created_at: string
}

export interface TimeOffRequest {
  id: string
  employee_id: string
  type_id: string
  start_date: string
  end_date: string
  total_days: number
  status: TimeOffStatus
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  reviewer_notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffRequestWithType extends TimeOffRequest {
  type: TimeOffType
}

// =====================================================
// MARKETING & GROWTH
// =====================================================

export interface MarketingCampaign {
  id: string
  name: string
  description: string | null
  budget: number | null
  spent: number
  start_date: string | null
  end_date: string | null
  status: CampaignStatus
  target_audience: string | null
  goals: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketingEvent {
  id: string
  campaign_id: string | null
  name: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  staffing_needs: number
  budget: number | null
  status: 'planned' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
}

export interface MarketingLead {
  id: string
  campaign_id: string | null
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  notes: string | null
  assigned_to: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface ReferralPartner {
  id: string
  hospital_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  tier: ReferralTier
  total_referrals: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id: string
  platform: SocialPlatform
  handle: string
  profile_url: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  followers_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SocialPost {
  id: string
  account_id: string
  campaign_id: string | null
  content: string
  media_urls: string[] | null
  scheduled_time: string | null
  published_time: string | null
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'deleted'
  engagement_data: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// HR & PERFORMANCE
// =====================================================

export interface ReviewTemplate {
  id: string
  name: string
  description: string | null
  form_schema: Record<string, unknown>[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id: string
  template_id: string | null
  review_cycle: string
  review_date: string | null
  status: ReviewStatus
  overall_rating: number | null
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewResponse {
  id: string
  review_id: string
  answers: Record<string, unknown>
  comments: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  employee_id: string
  title: string
  description: string | null
  category: string | null
  target_date: string | null
  progress_percent: number
  status: 'active' | 'completed' | 'cancelled' | 'on_hold'
  review_id: string | null
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  from_id: string
  to_id: string
  message: string
  feedback_type: FeedbackType
  is_anonymous: boolean
  is_public: boolean
  created_at: string
}

export interface EmployeeNote {
  id: string
  employee_id: string
  author_id: string
  note: string
  visibility: 'private' | 'manager' | 'hr' | 'admin'
  category: string | null
  created_at: string
  updated_at: string
}

export interface EmployeePaySetting {
  id: string
  employee_id: string
  pay_rate: number
  pay_type: PayType
  pay_frequency: 'weekly' | 'biweekly' | 'monthly'
  effective_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// COMPOSITE TYPES FOR UI
// =====================================================

export interface ProfileWithSkills extends Profile {
  // Skills can come as employee_skills from join
  skills?: UserSkillWithDetails[]
  employee_skills?: EmployeeSkillWithDetails[]
  // Employee data from join
  employee?: EmployeeWithDepartment | null
  // Flattened fields for convenience (may come from employee join)
  department?: Department | null
  position?: JobPosition | string | null
  location?: Location | null
  hire_date?: string | null
}

export interface EmployeeSkillWithDetails {
  id: string
  profile_id?: string
  employee_id?: string
  skill_id: string
  level: SkillLevel
  notes?: string | null
  created_at: string
  updated_at: string
  skill?: Skill | null
}

export interface EmployeeWithDepartment extends Employee {
  department?: Department | null
  position?: JobPosition | null
  location?: Location | null
}

export interface DashboardStats {
  totalEmployees: number
  activeShifts: number
  pendingTimeOff: number
  activeCampaigns: number
  upcomingEvents: number
  pendingReviews: number
}

// =====================================================
// DATABASE TYPE DEFINITIONS (for Supabase client)
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at'>>
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>
      }
      skill_library: {
        Row: Skill
        Insert: Omit<Skill, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Skill, 'id' | 'created_at' | 'updated_at'>>
      }
      user_skills: {
        Row: UserSkill
        Insert: Omit<UserSkill, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserSkill, 'id' | 'created_at' | 'updated_at'>>
      }
      schedules: {
        Row: Schedule
        Insert: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Schedule, 'id' | 'created_at' | 'updated_at'>>
      }
      shifts: {
        Row: Shift
        Insert: Omit<Shift, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Shift, 'id' | 'created_at' | 'updated_at'>>
      }
      time_off_requests: {
        Row: TimeOffRequest
        Insert: Omit<TimeOffRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TimeOffRequest, 'id' | 'created_at' | 'updated_at'>>
      }
      marketing_campaigns: {
        Row: MarketingCampaign
        Insert: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>>
      }
      marketing_leads: {
        Row: MarketingLead
        Insert: Omit<MarketingLead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MarketingLead, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_current_employee_id: {
        Args: Record<string, never>
        Returns: string | null
      }
    }
  }
}
