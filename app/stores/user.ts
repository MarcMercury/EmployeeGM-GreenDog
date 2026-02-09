import { defineStore } from 'pinia'
import type { UserProfile, UserEmployee, UserData } from '~/types/admin.types'

export type { UserProfile, UserEmployee, UserData }

interface UserState {
  profile: UserProfile | null
  employee: UserEmployee | null
  isLoading: boolean
  error: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    profile: null,
    employee: null,
    isLoading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.profile,
    isAdmin: (state) => ['super_admin', 'admin'].includes(state.profile?.role || ''),
    
    fullName: (state) => {
      if (state.employee?.preferred_name) return state.employee.preferred_name
      if (state.profile?.first_name || state.profile?.last_name) {
        return `${state.profile.first_name || ''} ${state.profile.last_name || ''}`.trim()
      }
      return state.profile?.email || ''
    },

    initials: (state) => {
      const first = state.profile?.first_name?.[0] || ''
      const last = state.profile?.last_name?.[0] || ''
      return (first + last).toUpperCase() || state.profile?.email?.[0]?.toUpperCase() || '?'
    },

    jobTitle: (state) => state.employee?.position?.title || 'Team Member',
    
    departmentName: (state) => state.employee?.department?.name || null,
    
    locationName: (state) => state.employee?.location?.name || null,

    tenure: (state) => {
      if (!state.employee?.hire_date) return null
      const hireDate = new Date(state.employee.hire_date)
      const now = new Date()
      const diffMs = now.getTime() - hireDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      
      if (years > 0) {
        return `${years}y ${months}m`
      }
      return `${months}m`
    },

    employmentStatus: (state) => {
      const status = state.employee?.employment_status || 'active'
      return status.charAt(0).toUpperCase() + status.slice(1)
    },

    employmentType: (state) => {
      const type = state.employee?.employment_type || 'full-time'
      return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
    }
  },

  actions: {
    async fetchUserData(force = false) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      // First, try to get auth info from authStore (already fetched in layout)
      // Fall back to useSupabaseUser() if authStore not populated
      let authUserId: string | undefined
      
      if (authStore.profile?.auth_user_id) {
        // Use existing auth data
        authUserId = authStore.profile.auth_user_id
      } else {
        // Try to get from Supabase session directly
        const { data: { session } } = await supabase.auth.getSession()
        authUserId = session?.user?.id
      }

      // Guard: Make sure we have a valid user ID
      if (!authUserId) {
        console.log('[UserStore] No auth user ID available, clearing data')
        this.profile = null
        this.employee = null
        return
      }

      // Skip fetch if we already have data for this user (unless forced)
      if (!force && this.profile && this.profile.auth_user_id === authUserId && this.employee) {
        console.log('[UserStore] Data already loaded for this user, skipping fetch')
        return
      }

      this.isLoading = true
      this.error = null

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUserId)
          .single()

        if (profileError) throw profileError
        this.profile = profileData as UserProfile
        console.log('[UserStore] Profile loaded:', this.profile?.id, this.profile?.email)

        // Fetch employee with joined data - try profile_id first
        let employeeData = null
        let employeeError = null
        
        if (this.profile?.id) {
          const result = await supabase
            .from('employees')
            .select(`
              *,
              department:departments(id, name, code),
              position:job_positions(id, title, code, is_manager),
              location:locations(id, name, city)
            `)
            .eq('profile_id', this.profile.id)
            .single()
          
          employeeData = result.data
          employeeError = result.error
        }

        // Fallback: If no employee found by profile_id, try by email
        if (!employeeData && this.profile?.email) {
          console.log('[UserStore] No employee by profile_id, trying email lookup...')
          const result = await supabase
            .from('employees')
            .select(`
              *,
              department:departments(id, name, code),
              position:job_positions(id, title, code, is_manager),
              location:locations(id, name, city)
            `)
            .eq('email_work', this.profile.email)
            .single()
          
          employeeData = result.data
          employeeError = result.error
          
          // If found by email, update the employee's profile_id to link them
          if (employeeData && !employeeData.profile_id) {
            console.log('[UserStore] Linking employee to profile...')
            await supabase
              .from('employees')
              .update({ profile_id: this.profile.id })
              .eq('id', employeeData.id)
            employeeData.profile_id = this.profile.id
          }
        }

        // Fallback 2: If still no employee, try by first_name + last_name from profile
        if (!employeeData && this.profile?.first_name && this.profile?.last_name) {
          console.log('[UserStore] Trying name lookup:', this.profile.first_name, this.profile.last_name)
          const result = await supabase
            .from('employees')
            .select(`
              *,
              department:departments(id, name, code),
              position:job_positions(id, title, code, is_manager),
              location:locations(id, name, city)
            `)
            .ilike('first_name', this.profile.first_name)
            .ilike('last_name', this.profile.last_name)
            .single()
          
          employeeData = result.data
          employeeError = result.error
          
          // If found by name, update the employee's profile_id to link them
          if (employeeData && !employeeData.profile_id) {
            console.log('[UserStore] Linking employee to profile by name match...')
            await supabase
              .from('employees')
              .update({ profile_id: this.profile.id })
              .eq('id', employeeData.id)
            employeeData.profile_id = this.profile.id
          }
        }

        if (employeeError && employeeError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is okay
          console.log('[UserStore] Employee query error:', employeeError)
        }
        
        this.employee = employeeData as UserEmployee | null
        console.log('[UserStore] Data loaded - Employee ID:', this.employee?.id, 'Name:', this.employee?.first_name)

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch user data'
        console.error('Error fetching user data:', err)
      } finally {
        this.isLoading = false
      }
    },

    async updateProfile(updates: {
      preferred_name?: string | null
      phone_mobile?: string | null
      bio?: string | null
      avatar_url?: string | null
    }) {
      const supabase = useSupabaseClient()
      
      if (!this.profile) {
        throw new Error('No profile to update')
      }

      this.isLoading = true
      this.error = null

      try {
        // Update profiles table
        const profileUpdates: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        }
        if ('bio' in updates) profileUpdates.bio = updates.bio
        if ('avatar_url' in updates) profileUpdates.avatar_url = updates.avatar_url

        if (Object.keys(profileUpdates).length > 1) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', this.profile.id)

          if (profileError) throw profileError
        }

        // Update employees table if we have an employee record
        if (this.employee) {
          const employeeUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
          }
          if ('preferred_name' in updates) employeeUpdates.preferred_name = updates.preferred_name
          if ('phone_mobile' in updates) employeeUpdates.phone_mobile = updates.phone_mobile

          if (Object.keys(employeeUpdates).length > 1) {
            const { error: employeeError } = await supabase
              .from('employees')
              .update(employeeUpdates)
              .eq('id', this.employee.id)

            if (employeeError) throw employeeError
          }
        }

        // Refresh data
        await this.fetchUserData()
        return true

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update profile'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    clearUser() {
      this.profile = null
      this.employee = null
      this.error = null
    }
  }
})
