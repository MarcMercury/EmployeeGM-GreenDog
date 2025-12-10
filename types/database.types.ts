// Database Types - Generated from Supabase schema
// These types must match the database schema exactly

export type UserRole = 'admin' | 'user'

export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5

export type SkillCategory = 'learning' | 'competent' | 'mentor'

export type TimeOffStatus = 'pending' | 'approved' | 'denied'

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'full-day' | 'off'

// Helper function to get skill category from level
export function getSkillCategory(level: SkillLevel): SkillCategory {
  if (level <= 2) return 'learning'
  if (level <= 4) return 'competent'
  return 'mentor'
}

// Database table types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      skills: {
        Row: Skill
        Insert: SkillInsert
        Update: SkillUpdate
      }
      employee_skills: {
        Row: EmployeeSkill
        Insert: EmployeeSkillInsert
        Update: EmployeeSkillUpdate
      }
      schedules: {
        Row: Schedule
        Insert: ScheduleInsert
        Update: ScheduleUpdate
      }
      time_off_requests: {
        Row: TimeOffRequest
        Insert: TimeOffRequestInsert
        Update: TimeOffRequestUpdate
      }
      departments: {
        Row: Department
        Insert: DepartmentInsert
        Update: DepartmentUpdate
      }
      leads: {
        Row: Lead
        Insert: LeadInsert
        Update: LeadUpdate
      }
      marketing_campaigns: {
        Row: MarketingCampaign
        Insert: MarketingCampaignInsert
        Update: MarketingCampaignUpdate
      }
    }
    Views: {
      [key: string]: never
    }
    Functions: {
      [key: string]: never
    }
    Enums: {
      user_role: UserRole
      skill_level: SkillLevel
      time_off_status: TimeOffStatus
      shift_type: ShiftType
    }
  }
}

// Profile - 1:1 with auth.users
export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  department_id: string | null
  avatar_url: string | null
  phone: string | null
  hire_date: string | null
  position: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role?: UserRole
  department_id?: string | null
  avatar_url?: string | null
  phone?: string | null
  hire_date?: string | null
  position?: string | null
  is_active?: boolean
}

export interface ProfileUpdate {
  email?: string
  first_name?: string
  last_name?: string
  role?: UserRole
  department_id?: string | null
  avatar_url?: string | null
  phone?: string | null
  hire_date?: string | null
  position?: string | null
  is_active?: boolean
  updated_at?: string
}

// Skills - Master list of available skills
export interface Skill {
  id: string
  name: string
  description: string | null
  category: string
  is_active: boolean
  created_at: string
}

export interface SkillInsert {
  name: string
  description?: string | null
  category: string
  is_active?: boolean
}

export interface SkillUpdate {
  name?: string
  description?: string | null
  category?: string
  is_active?: boolean
}

// Employee Skills - Junction table for profiles <-> skills with rating
export interface EmployeeSkill {
  id: string
  profile_id: string
  skill_id: string
  level: SkillLevel
  notes: string | null
  certified_at: string | null
  certified_by: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSkillInsert {
  profile_id: string
  skill_id: string
  level?: SkillLevel
  notes?: string | null
  certified_at?: string | null
  certified_by?: string | null
}

export interface EmployeeSkillUpdate {
  level?: SkillLevel
  notes?: string | null
  certified_at?: string | null
  certified_by?: string | null
  updated_at?: string
}

// Schedules
export interface Schedule {
  id: string
  profile_id: string
  date: string
  shift_type: ShiftType
  start_time: string | null
  end_time: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ScheduleInsert {
  profile_id: string
  date: string
  shift_type: ShiftType
  start_time?: string | null
  end_time?: string | null
  notes?: string | null
  created_by: string
}

export interface ScheduleUpdate {
  shift_type?: ShiftType
  start_time?: string | null
  end_time?: string | null
  notes?: string | null
  updated_at?: string
}

// Time Off Requests
export interface TimeOffRequest {
  id: string
  profile_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: TimeOffStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffRequestInsert {
  profile_id: string
  start_date: string
  end_date: string
  reason?: string | null
  status?: TimeOffStatus
}

export interface TimeOffRequestUpdate {
  start_date?: string
  end_date?: string
  reason?: string | null
  status?: TimeOffStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  updated_at?: string
}

// Departments
export interface Department {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DepartmentInsert {
  name: string
  description?: string | null
  manager_id?: string | null
  is_active?: boolean
}

export interface DepartmentUpdate {
  name?: string
  description?: string | null
  manager_id?: string | null
  is_active?: boolean
  updated_at?: string
}

// Leads - Marketing/Internal leads tracking
export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  notes: string | null
  assigned_to: string | null
  campaign_id: string | null
  created_at: string
  updated_at: string
}

export interface LeadInsert {
  name: string
  email?: string | null
  phone?: string | null
  source?: string | null
  status?: string
  notes?: string | null
  assigned_to?: string | null
  campaign_id?: string | null
}

export interface LeadUpdate {
  name?: string
  email?: string | null
  phone?: string | null
  source?: string | null
  status?: string
  notes?: string | null
  assigned_to?: string | null
  campaign_id?: string | null
  updated_at?: string
}

// Marketing Campaigns
export interface MarketingCampaign {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface MarketingCampaignInsert {
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  status?: string
  created_by: string
}

export interface MarketingCampaignUpdate {
  name?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  status?: string
  updated_at?: string
}

// Computed types for frontend use
export interface ProfileWithSkills extends Profile {
  employee_skills: (EmployeeSkill & { skill: Skill })[]
}

export interface ProfileWithDepartment extends Profile {
  department: Department | null
}

export interface FullProfile extends Profile {
  employee_skills: (EmployeeSkill & { skill: Skill })[]
  department: Department | null
  schedules: Schedule[]
  time_off_requests: TimeOffRequest[]
}

// Stats types
export interface EmployeeStats {
  totalSkills: number
  averageSkillLevel: number
  mentorSkills: number
  scheduledDays: number
  pendingTimeOff: number
}
