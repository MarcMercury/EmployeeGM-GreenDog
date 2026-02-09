// =====================================================
// Skill Types — Consolidated shared interfaces
// =====================================================

/** @section Core Skill Definitions */

export interface Skill {
  id: string
  name: string
  category: string
  description?: string
  is_core?: boolean
  employee_count?: number
  avg_level?: number
}

export interface SkillLibraryItem {
  id: string
  name: string
  category: string
  description?: string | null
  level_descriptions?: Record<string, string> | null
  is_active?: boolean
}

export interface CategoryGroup {
  name: string
  skills: SkillLibraryItem[]
}

export interface Course {
  id: string
  title: string
  skill_id?: string
}

/** @section Employee Skill Records */

export interface EmployeeSkill {
  id: string
  skill_id: string
  name: string
  category: string
  level: number
  is_goal: boolean
  certified_at: string | null
  certified_by: string | null
  notes: string | null
}

export interface EmployeeSkillWithSkill extends EmployeeSkill {
  skill: Skill
}

export interface EmployeeSkillRating {
  skill_id: string
  rating: number
}

export interface MergedSkill {
  skillId: string
  name: string
  category: string
  description?: string
  level_descriptions?: Record<string, string> | null
  rating: number
}

export interface SkillRating {
  skill_id: string
  skill_name: string
  skill_description?: string
  category: string
  level: number
  originalLevel: number
  isDirty: boolean
  saving: boolean
}

/** @section Skill Categories & Radar */

export interface SkillCategory {
  name: string
  skills: EmployeeSkill[]
  avgLevel: number
}

export interface RadarDataPoint {
  category: string
  value: number
  fullMark: number
}

export interface RadarCategory {
  category: string
  value: number
  fullMark: number
}

/** @section Mentorship */

export interface GoalSkill {
  id: string
  skill_id: string
  name: string
  level: number
}

export interface PotentialMentor {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  skill_level: number
  department: string | null
  position: string | null
}

export interface MentorshipRequest {
  id: string
  skill_id: string
  skill_name: string
  mentee_id: string
  mentee_name: string
  mentor_id: string
  mentor_name: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  started_at: string
  mentee_avatar: string | null
}

/** @section Achievements & XP */

export interface Achievement {
  id: string
  name: string
  code: string
  description: string
  icon_url: string | null
  badge_color: string | null
  category: string
  points: number
  is_unlocked: boolean
  unlocked_at: string | null
}

export interface XPGain {
  id: string
  points: number
  reason: string
  source_type: 'achievement' | 'skill' | 'training' | 'manual' | 'attendance' | 'performance'
}

/** @section Skill Engine State */

export interface SkillEngineState {
  // Current user's skills
  mySkills: EmployeeSkill[]
  skillCategories: SkillCategory[]
  radarData: RadarDataPoint[]

  // XP and level
  totalXP: number
  currentLevel: number
  xpToNextLevel: number
  xpProgress: number

  // Mentorship
  potentialMentors: Map<string, PotentialMentor[]>
  myGoalSkills: EmployeeSkill[]
  incomingRequests: MentorshipRequest[]
  outgoingRequests: MentorshipRequest[]
  activeMentorships: MentorshipRequest[]

  // Achievements
  achievements: Achievement[]
  unlockedCount: number

  // Skill library for reference
  skillLibrary: { id: string; name: string; category: string; description: string }[]

  // Loading states
  isLoading: boolean
  isLoadingMentors: boolean
  error: string | null
}
