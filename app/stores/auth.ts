import { defineStore } from 'pinia'
import type { Profile, ProfileUpdate, UserRole } from '~/types/database.types'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  error: string | null
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    profile: null,
    isLoading: false,
    error: null,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.profile,
    isAdmin: (state) => state.profile?.role === 'admin',
    isUser: (state) => state.profile?.role === 'user',
    fullName: (state) => {
      if (!state.profile) return ''
      return `${state.profile.first_name || ''} ${state.profile.last_name || ''}`.trim() || state.profile.email
    },
    initials: (state) => {
      if (!state.profile) return ''
      const first = state.profile.first_name?.[0] || ''
      const last = state.profile.last_name?.[0] || ''
      return (first + last).toUpperCase() || state.profile.email[0].toUpperCase()
    }
  },

  actions: {
    async initialize() {
      if (this.initialized) return
      
      const user = useSupabaseUser()
      if (user.value && !this.profile) {
        await this.fetchProfile(user.value.id)
      }
      this.initialized = true
    },

    async fetchProfile(userId?: string) {
      const supabase = useSupabaseClient()
      const user = useSupabaseUser()
      
      // Use passed userId or fall back to user.value.id
      const authUserId = userId || user.value?.id

      if (!authUserId) {
        console.log('[AuthStore] No user ID available, skipping profile fetch')
        this.profile = null
        return null
      }

      console.log('[AuthStore] Fetching profile for auth_user_id:', authUserId)
      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUserId)
          .single()

        if (error) {
          console.error('[AuthStore] Profile fetch error:', error)
          throw error
        }
        
        console.log('[AuthStore] Profile fetched successfully:', data)
        this.profile = data as Profile
        return this.profile
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch profile'
        console.error('Error fetching profile:', err)
        return null
      } finally {
        this.isLoading = false
      }
    },

    async updateProfile(updates: ProfileUpdate) {
      const supabase = useSupabaseClient()
      
      if (!this.profile) {
        throw new Error('No profile to update')
      }

      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.profile.id)
          .select()
          .single()

        if (error) throw error
        this.profile = data as Profile
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update profile'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signIn(email: string, password: string) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error
        await this.fetchProfile()
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Sign in failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signOut() {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        this.profile = null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Sign out failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signUp(email: string, password: string, firstName: string, lastName: string) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName
            }
          }
        })

        if (error) throw error
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Sign up failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    // Check if user has specific role
    hasRole(role: UserRole): boolean {
      return this.profile?.role === role
    },

    // Check if user can perform admin actions
    canManage(): boolean {
      return this.isAdmin
    }
  }
})
