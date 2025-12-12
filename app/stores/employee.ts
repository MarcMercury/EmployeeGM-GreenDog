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
        // Fetch from employees table with all related data
        const { data, error } = await supabase
          .from('employees')
          .select(`
            *,
            profile:profiles!employees_profile_id_fkey (*),
            department:departments (*),
            position:job_positions (*),
            location:locations (*),
            employee_skills (
              *,
              skill:skill_library (*)
            )
          `)
          .eq('employment_status', 'active')
          .order('last_name')

        if (error) throw error
        
        // Transform to ProfileWithSkills format for backward compatibility
        // IMPORTANT: id should be the employee ID, not profile ID
        this.employees = (data || []).map(emp => ({
          id: emp.id, // Employee ID - used for /employees/[id] routing
          profile_id: emp.profile?.id || null, // Profile ID - for auth
          email: emp.profile?.email || emp.email_work || '',
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: emp.profile?.role || 'user',
          avatar_url: emp.profile?.avatar_url || null,
          phone: emp.phone_mobile || emp.phone_work || emp.profile?.phone || null,
          is_active: emp.employment_status === 'active',
          created_at: emp.created_at,
          updated_at: emp.updated_at,
          position: emp.position?.title || null,
          department: emp.department,
          location: emp.location,
          hire_date: emp.hire_date,
          employee_skills: emp.employee_skills || [],
          // Keep raw employee data for reference
          employee: emp
        })) as ProfileWithSkills[]
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
        // Try to find employee by profile_id first
        const { data, error } = await supabase
          .from('employees')
          .select(`
            *,
            profile:profiles!employees_profile_id_fkey (*),
            department:departments (*),
            position:job_positions (*),
            location:locations (*),
            employee_skills (
              *,
              skill:skill_library (*)
            )
          `)
          .eq('profile_id', id)
          .single()

        if (error) throw error
        
        // Transform to ProfileWithSkills format
        const emp = data
        this.selectedEmployee = {
          id: emp.profile?.id || emp.id,
          email: emp.profile?.email || emp.email_work || '',
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: emp.profile?.role || 'user',
          avatar_url: emp.profile?.avatar_url || null,
          phone: emp.phone_mobile || emp.phone_work || emp.profile?.phone || null,
          is_active: emp.employment_status === 'active',
          created_at: emp.created_at,
          updated_at: emp.updated_at,
          position: emp.position?.title || null,
          department: emp.department,
          location: emp.location,
          hire_date: emp.hire_date,
          employee_skills: emp.employee_skills || [],
          employee: emp
        } as ProfileWithSkills
        
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
          .from('skill_library')
          .select('*')
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
          .from('skill_library')
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
