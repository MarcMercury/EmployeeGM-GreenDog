import { defineStore } from 'pinia'
import type { 
  Profile, 
  ProfileWithSkills, 
  EmployeeSkill, 
  Skill,
  SkillLevel,
  EmployeeStats 
} from '~/types/database.types'

interface EmployeeState {
  employees: ProfileWithSkills[]
  selectedEmployee: ProfileWithSkills | null
  skills: Skill[]
  isLoading: boolean
  error: string | null
}

export const useEmployeeStore = defineStore('employee', {
  state: (): EmployeeState => ({
    employees: [],
    selectedEmployee: null,
    skills: [],
    isLoading: false,
    error: null
  }),

  getters: {
    activeEmployees: (state) => state.employees.filter(e => e.is_active),
    
    getEmployeeById: (state) => (id: string) => 
      state.employees.find(e => e.id === id),
    
    employeesByDepartment: (state) => (departmentId: string) => 
      state.employees.filter(e => e.department_id === departmentId),
    
    getEmployeeStats: () => (employee: ProfileWithSkills): EmployeeStats => {
      const skills = employee.employee_skills || []
      const totalSkills = skills.length
      const averageSkillLevel = totalSkills > 0 
        ? skills.reduce((sum, s) => sum + s.level, 0) / totalSkills 
        : 0
      const mentorSkills = skills.filter(s => s.level === 5).length

      return {
        totalSkills,
        averageSkillLevel: Math.round(averageSkillLevel * 10) / 10,
        mentorSkills,
        scheduledDays: 0, // Will be populated from schedules
        pendingTimeOff: 0 // Will be populated from time off requests
      }
    },

    mentors: (state) => {
      return state.employees.filter(e => 
        e.employee_skills?.some(s => s.level === 5)
      )
    },

    skillCategories: (state) => {
      const categories = new Set(state.skills.map(s => s.category))
      return Array.from(categories)
    }
  },

  actions: {
    async fetchEmployees() {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            employee_skills (
              *,
              skill:skills (*)
            )
          `)
          .order('last_name')

        if (error) throw error
        this.employees = data as ProfileWithSkills[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch employees'
        console.error('Error fetching employees:', err)
      } finally {
        this.isLoading = false
      }
    },

    async fetchEmployee(id: string) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            employee_skills (
              *,
              skill:skills (*)
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        this.selectedEmployee = data as ProfileWithSkills
        return this.selectedEmployee
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch employee'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchSkills() {
      const supabase = useSupabaseClient()
      
      try {
        const { data, error } = await supabase
          .from('skills')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name')

        if (error) throw error
        this.skills = data as Skill[]
      } catch (err) {
        console.error('Error fetching skills:', err)
      }
    },

    async updateEmployeeSkill(
      profileId: string, 
      skillId: string, 
      level: SkillLevel,
      notes?: string
    ) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      
      this.isLoading = true

      try {
        // Check if skill exists
        const { data: existing } = await supabase
          .from('employee_skills')
          .select('id')
          .eq('profile_id', profileId)
          .eq('skill_id', skillId)
          .single()

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('employee_skills')
            .update({
              level,
              notes,
              certified_by: level === 5 ? authStore.profile?.id : null,
              certified_at: level === 5 ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (error) throw error
        } else {
          // Insert new
          const { error } = await supabase
            .from('employee_skills')
            .insert({
              profile_id: profileId,
              skill_id: skillId,
              level,
              notes,
              certified_by: level === 5 ? authStore.profile?.id : null,
              certified_at: level === 5 ? new Date().toISOString() : null
            })

          if (error) throw error
        }

        // Refresh employee data
        await this.fetchEmployee(profileId)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update skill'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createSkill(skill: { name: string; description?: string; category: string }) {
      const supabase = useSupabaseClient()
      
      try {
        const { data, error } = await supabase
          .from('skills')
          .insert(skill)
          .select()
          .single()

        if (error) throw error
        this.skills.push(data as Skill)
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create skill'
        throw err
      }
    },

    clearSelectedEmployee() {
      this.selectedEmployee = null
    }
  }
})
