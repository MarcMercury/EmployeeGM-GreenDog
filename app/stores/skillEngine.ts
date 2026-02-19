import { defineStore } from 'pinia'
import type { SkillCategory, EmployeeSkill, RadarDataPoint, PotentialMentor, MentorshipRequest, Achievement, SkillEngineState } from '~/types/skill.types'

// XP thresholds for each level
const XP_CURVE = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2700,   // Level 8
  3700,   // Level 9
  5000    // Level 10 (max)
]

export const useSkillEngineStore = defineStore('skillEngine', {
  state: (): SkillEngineState => ({
    mySkills: [],
    skillCategories: [],
    radarData: [],
    totalXP: 0,
    currentLevel: 1,
    xpToNextLevel: 100,
    xpProgress: 0,
    potentialMentors: new Map(),
    myGoalSkills: [],
    incomingRequests: [],
    outgoingRequests: [],
    activeMentorships: [],
    achievements: [],
    unlockedCount: 0,
    skillLibrary: [],
    isLoading: false,
    isLoadingMentors: false,
    error: null
  }),

  getters: {
    /**
     * Get skills for the current user that they can mentor (level >= 4)
     */
    mentorableSkills: (state) => state.mySkills.filter(s => s.level >= 4),

    /**
     * Get skills marked as goals (wanting to learn)
     */
    goalSkills: (state) => state.mySkills.filter(s => s.is_goal),

    /**
     * Get skills grouped by category
     */
    skillsByCategory: (state) => (category: string) => 
      state.mySkills.filter(s => s.category === category),

    /**
     * Check if user is eligible to be a mentor
     */
    canBeMentor: (state) => state.mySkills.some(s => s.level >= 4),

    /**
     * Get pending incoming request count
     */
    pendingRequestCount: (state) => state.incomingRequests.filter(r => r.status === 'pending').length,

    /**
     * Calculate level from XP
     */
    getLevelFromXP: () => (xp: number) => {
      for (let i = XP_CURVE.length - 1; i >= 0; i--) {
        if (xp >= XP_CURVE[i]) {
          return i + 1
        }
      }
      return 1
    }
  },

  actions: {
    /**
     * Fetch current user's skills and compute radar data
     */
    async fetchMySkills() {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      
      // Emergency admin — no real employee record
      if ((authStore.profile as any)?.is_emergency || authStore.profile?.id?.startsWith('emergency-')) {
        this.isLoading = false
        return
      }

      this.isLoading = true
      this.error = null

      try {
        // Get employee ID for current user
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .maybeSingle()

        if (!employee) {
          this.error = 'Employee profile not found'
          return
        }

        // Fetch skills with library info
        const { data: skills, error } = await supabase
          .from('employee_skills')
          .select(`
            id,
            skill_id,
            level,
            is_goal,
            certified_at,
            certified_by_employee_id,
            notes,
            skill:skill_library (
              id,
              name,
              category,
              description
            )
          `)
          .eq('employee_id', employee.id)

        if (error) throw error

        // Transform to EmployeeSkill
        this.mySkills = (skills || []).map(s => ({
          id: s.id,
          skill_id: s.skill_id,
          name: s.skill?.name || 'Unknown',
          category: s.skill?.category || 'General',
          level: s.level,
          is_goal: s.is_goal || false,
          certified_at: s.certified_at,
          certified_by: s.certified_by_employee_id,
          notes: s.notes
        }))

        // Update goal skills
        this.myGoalSkills = this.mySkills.filter(s => s.is_goal)

        // Compute radar data by category
        this.computeRadarData()

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch skills'
        console.error('Error fetching skills:', err)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Compute radar chart data grouped by category
     */
    computeRadarData() {
      const categoryMap = new Map<string, { total: number; count: number }>()
      
      for (const skill of this.mySkills) {
        const existing = categoryMap.get(skill.category) || { total: 0, count: 0 }
        categoryMap.set(skill.category, {
          total: existing.total + skill.level,
          count: existing.count + 1
        })
      }

      // Build radar data
      this.radarData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category: this.shortenCategoryName(category),
        value: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
        fullMark: 5
      }))

      // Build skill categories
      this.skillCategories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        skills: this.mySkills.filter(s => s.category === name),
        avgLevel: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0
      }))
    },

    /**
     * Shorten category names for radar chart display
     */
    shortenCategoryName(name: string): string {
      const mapping: Record<string, string> = {
        'Clinical Skills': 'Clinical',
        'Diagnostics & Imaging': 'Diagnostics',
        'Surgical & Procedural': 'Surgical',
        'Emergency & Critical Care': 'Emergency',
        'Pharmacy & Treatment': 'Pharmacy',
        'Client Communication': 'Client Comm',
        'Administrative & Operations': 'Admin',
        'HR / People Ops': 'HR',
        'Training & Education': 'Training',
        'Technology & Equipment': 'Tech'
      }
      return mapping[name] || name.split(' ')[0]
    },

    /**
     * Fetch XP and calculate level
     */
    async fetchXPAndLevel() {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      if ((authStore.profile as any)?.is_emergency || authStore.profile?.id?.startsWith('emergency-')) return

      try {
        // Get employee ID
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .maybeSingle()

        if (!employee) return

        // Sum all points
        const { data, error } = await supabase
          .from('points_log')
          .select('points')
          .eq('employee_id', employee.id)

        if (error) throw error

        this.totalXP = (data || []).reduce((sum, p) => sum + p.points, 0)
        
        // Calculate level
        this.currentLevel = this.getLevelFromXP(this.totalXP)
        
        // Calculate progress to next level
        const currentLevelXP = XP_CURVE[this.currentLevel - 1] || 0
        const nextLevelXP = XP_CURVE[this.currentLevel] || XP_CURVE[XP_CURVE.length - 1]
        this.xpToNextLevel = nextLevelXP - currentLevelXP
        this.xpProgress = this.totalXP - currentLevelXP

      } catch (err) {
        console.error('Error fetching XP:', err)
      }
    },

    /**
     * Toggle a skill as a learning goal
     */
    async toggleSkillGoal(skillId: string, employeeSkillId: string) {
      const supabase = useSupabaseClient()
      
      const skill = this.mySkills.find(s => s.id === employeeSkillId)
      if (!skill) return

      const newGoalState = !skill.is_goal

      const { error } = await supabase
        .from('employee_skills')
        .update({ is_goal: newGoalState })
        .eq('id', employeeSkillId)

      if (error) throw error

      // Update local state
      skill.is_goal = newGoalState
      this.myGoalSkills = this.mySkills.filter(s => s.is_goal)
    },

    /**
     * Find mentors for a specific skill (rating >= 4)
     */
    async getMentorsForSkill(skillId: string): Promise<PotentialMentor[]> {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      if ((authStore.profile as any)?.is_emergency || authStore.profile?.id?.startsWith('emergency-')) return []
      
      this.isLoadingMentors = true

      try {
        // Get current employee ID to exclude self
        const { data: currentEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .maybeSingle()

        // Find other employees with skill level >= 4
        const { data, error } = await supabase
          .from('employee_skills')
          .select(`
            level,
            employee:employees (
              id,
              first_name,
              last_name,
              profile:profiles (avatar_url),
              department:departments (name),
              position:job_positions (title)
            )
          `)
          .eq('skill_id', skillId)
          .gte('level', 4)
          .neq('employee_id', currentEmployee?.id || '')

        if (error) throw error

        const mentors: PotentialMentor[] = (data || [])
          .filter(d => d.employee)
          .map(d => ({
            id: `${d.employee.id}-${skillId}`,
            employee_id: d.employee.id,
            first_name: d.employee.first_name,
            last_name: d.employee.last_name,
            avatar_url: d.employee.profile?.avatar_url || null,
            skill_level: d.level,
            department: d.employee.department?.name || null,
            position: d.employee.position?.title || null
          }))

        // Cache mentors for this skill
        this.potentialMentors.set(skillId, mentors)
        
        return mentors

      } catch (err) {
        console.error('Error fetching mentors:', err)
        return []
      } finally {
        this.isLoadingMentors = false
      }
    },

    /**
     * Request mentorship for a skill
     */
    async requestMentorship(skillId: string, mentorEmployeeId: string) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      // Get current employee ID
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', authStore.profile?.id)
        .maybeSingle()

      if (!currentEmployee) throw new Error('Employee not found')

      // Create mentorship request
      const { error } = await supabase
        .from('mentorships')
        .insert({
          skill_id: skillId,
          mentor_employee_id: mentorEmployeeId,
          mentee_employee_id: currentEmployee.id,
          status: 'pending'
        })

      if (error) throw error

      // Refresh outgoing requests
      await this.fetchMentorshipRequests()
    },

    /**
     * Fetch all mentorship requests (incoming and outgoing)
     */
    async fetchMentorshipRequests() {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      if ((authStore.profile as any)?.is_emergency || authStore.profile?.id?.startsWith('emergency-')) return

      try {
        // Get current employee ID
        const { data: currentEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .maybeSingle()

        if (!currentEmployee) return

        // Fetch incoming requests (I'm the mentor)
        const { data: incoming } = await supabase
          .from('mentorships')
          .select(`
            id,
            skill_id,
            status,
            started_at,
            skill:skill_library (name),
            mentee:employees!mentorships_mentee_employee_id_fkey (
              id, first_name, last_name,
              profile:profiles (avatar_url)
            ),
            mentor:employees!mentorships_mentor_employee_id_fkey (
              id, first_name, last_name
            )
          `)
          .eq('mentor_employee_id', currentEmployee.id)
          .in('status', ['pending', 'active'])

        this.incomingRequests = (incoming || []).map(r => ({
          id: r.id,
          skill_id: r.skill_id,
          skill_name: r.skill?.name || 'Unknown',
          mentee_id: r.mentee?.id,
          mentee_name: `${r.mentee?.first_name} ${r.mentee?.last_name}`,
          mentor_id: r.mentor?.id,
          mentor_name: `${r.mentor?.first_name} ${r.mentor?.last_name}`,
          status: r.status,
          started_at: r.started_at,
          mentee_avatar: r.mentee?.profile?.avatar_url || null
        }))

        // Fetch outgoing requests (I'm the mentee)
        const { data: outgoing } = await supabase
          .from('mentorships')
          .select(`
            id,
            skill_id,
            status,
            started_at,
            skill:skill_library (name),
            mentee:employees!mentorships_mentee_employee_id_fkey (
              id, first_name, last_name
            ),
            mentor:employees!mentorships_mentor_employee_id_fkey (
              id, first_name, last_name,
              profile:profiles (avatar_url)
            )
          `)
          .eq('mentee_employee_id', currentEmployee.id)
          .in('status', ['pending', 'active'])

        this.outgoingRequests = (outgoing || []).map(r => ({
          id: r.id,
          skill_id: r.skill_id,
          skill_name: r.skill?.name || 'Unknown',
          mentee_id: r.mentee?.id,
          mentee_name: `${r.mentee?.first_name} ${r.mentee?.last_name}`,
          mentor_id: r.mentor?.id,
          mentor_name: `${r.mentor?.first_name} ${r.mentor?.last_name}`,
          status: r.status,
          started_at: r.started_at,
          mentee_avatar: r.mentor?.profile?.avatar_url || null
        }))

        // Active mentorships (both incoming and outgoing that are active)
        this.activeMentorships = [
          ...this.incomingRequests.filter(r => r.status === 'active'),
          ...this.outgoingRequests.filter(r => r.status === 'active')
        ]

      } catch (err) {
        console.error('Error fetching mentorship requests:', err)
      }
    },

    /**
     * Accept a mentorship request
     */
    async acceptMentorship(mentorshipId: string) {
      const supabase = useSupabaseClient()
      
      const { error } = await supabase
        .from('mentorships')
        .update({ status: 'active' })
        .eq('id', mentorshipId)

      if (error) throw error

      // Update local state
      const request = this.incomingRequests.find(r => r.id === mentorshipId)
      if (request) {
        request.status = 'active'
        this.activeMentorships.push(request)
      }
    },

    /**
     * Decline a mentorship request
     */
    async declineMentorship(mentorshipId: string) {
      const supabase = useSupabaseClient()
      
      const { error } = await supabase
        .from('mentorships')
        .update({ status: 'cancelled' })
        .eq('id', mentorshipId)

      if (error) throw error

      // Remove from local state
      this.incomingRequests = this.incomingRequests.filter(r => r.id !== mentorshipId)
    },

    /**
     * Fetch all achievements with unlock status
     */
    async fetchAchievements() {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      if ((authStore.profile as any)?.is_emergency || authStore.profile?.id?.startsWith('emergency-')) return

      try {
        // Get employee ID
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .maybeSingle()

        if (!employee) return

        // Fetch all achievements with employee's unlock status
        const { data: allAchievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('is_active', true)
          .order('category')

        // Fetch user's unlocked achievements
        const { data: unlocked } = await supabase
          .from('employee_achievements')
          .select('achievement_id, earned_at')
          .eq('employee_id', employee.id)

        const unlockedMap = new Map(
          (unlocked || []).map(u => [u.achievement_id, u.earned_at])
        )

        this.achievements = (allAchievements || []).map(a => ({
          id: a.id,
          name: a.name,
          code: a.code,
          description: a.description,
          icon_url: a.icon_url,
          badge_color: a.badge_color,
          category: a.category,
          points: a.points,
          is_unlocked: unlockedMap.has(a.id),
          unlocked_at: unlockedMap.get(a.id) || null
        }))

        this.unlockedCount = this.achievements.filter(a => a.is_unlocked).length

      } catch (err) {
        console.error('Error fetching achievements:', err)
      }
    },

    /**
     * Fetch the skill library for reference
     */
    async fetchSkillLibrary() {
      const supabase = useSupabaseClient()

      const { data } = await supabase
        .from('skill_library')
        .select('id, name, category, description')
        .order('category')
        .order('name')

      this.skillLibrary = data || []
    },

    /**
     * Self-rate a skill (capped at 3 for MVP)
     */
    async selfRateSkill(skillId: string, level: number) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      // Cap at 3 for self-rating
      const cappedLevel = Math.min(level, 3)

      // Get employee ID
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', authStore.profile?.id)
        .maybeSingle()

      if (!employee) throw new Error('Employee not found')

      // Check if skill exists for employee
      const existing = this.mySkills.find(s => s.skill_id === skillId)

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('employee_skills')
          .update({ level: cappedLevel })
          .eq('id', existing.id)

        if (error) throw error
        existing.level = cappedLevel
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('employee_skills')
          .insert({
            employee_id: employee.id,
            skill_id: skillId,
            level: cappedLevel
          })
          .select()
          .single()

        if (error) throw error

        // Fetch the skill details
        const { data: skillInfo } = await supabase
          .from('skill_library')
          .select('name, category')
          .eq('id', skillId)
          .single()

        this.mySkills.push({
          id: data.id,
          skill_id: skillId,
          name: skillInfo?.name || 'Unknown',
          category: skillInfo?.category || 'General',
          level: cappedLevel,
          is_goal: false,
          certified_at: null,
          certified_by: null,
          notes: null
        })
      }

      // Recompute radar data
      this.computeRadarData()
    },

    /**
     * Initialize all skill engine data
     */
    async initialize() {
      this.isLoading = true
      
      try {
        await Promise.all([
          this.fetchMySkills(),
          this.fetchXPAndLevel(),
          this.fetchMentorshipRequests(),
          this.fetchAchievements(),
          this.fetchSkillLibrary()
        ])
      } finally {
        this.isLoading = false
      }
    }
  }
})
