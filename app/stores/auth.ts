import { defineStore } from 'pinia'
import type { Profile, ProfileUpdate, UserRole } from '~/types/database.types'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  error: string | null
  initialized: boolean
}

// Helper to get supabase client safely in Pinia
// @nuxtjs/supabase provides: { client } via provide("supabase", { client })
const getSupabase = () => {
  const nuxtApp = useNuxtApp()
  return (nuxtApp.$supabase as { client: ReturnType<typeof import('@supabase/supabase-js').createClient> })?.client
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
      this.initialized = true
    },

    async fetchProfile(userId?: string) {
      const supabase = getSupabase()
      
      if (!supabase) {
        console.error('[AuthStore] Supabase client not available')
        return null
      }

      const authUserId = userId

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
      } catch (err: any) {
        this.error = err?.message || 'Failed to fetch profile'
        console.error('[AuthStore] Error:', err)
        return null
      } finally {
        this.isLoading = false
      }
    },

    async updateProfile(updates: ProfileUpdate) {
      const supabase = getSupabase()
      
      if (!this.profile || !supabase) {
        throw new Error('No profile to update or supabase not ready')
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
      } catch (err: any) {
        this.error = err?.message || 'Failed to update profile'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signOut() {
      const supabase = getSupabase()
      if (!supabase) return
      
      this.isLoading = true

      try {
        await supabase.auth.signOut()
        this.profile = null
        this.initialized = false
      } catch (err) {
        console.error('Error signing out:', err)
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    hasRole(role: UserRole): boolean {
      return this.profile?.role === role
    },

    canManage(): boolean {
      return this.isAdmin
    },

    $reset() {
      this.profile = null
      this.isLoading = false
      this.error = null
      this.initialized = false
    }
  }
})
