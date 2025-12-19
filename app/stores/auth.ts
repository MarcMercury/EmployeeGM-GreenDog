import { defineStore } from 'pinia'
import type { Profile, ProfileUpdate, UserRole, ROLE_HIERARCHY } from '~/types'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  error: string | null
  initialized: boolean
}

// Role hierarchy for access level comparisons
const roleHierarchy: Record<string, number> = {
  admin: 100,
  office_admin: 50,
  marketing_admin: 40,
  user: 10
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
    
    // Role checks
    userRole: (state): UserRole => (state.profile?.role as UserRole) || 'user',
    isAdmin: (state) => state.profile?.role === 'admin',
    isOfficeAdmin: (state) => state.profile?.role === 'office_admin',
    isMarketingAdmin: (state) => state.profile?.role === 'marketing_admin',
    isUser: (state) => state.profile?.role === 'user',
    
    // Access level checks (for section visibility)
    hasManagementAccess: (state) => ['admin', 'office_admin'].includes(state.profile?.role || ''),
    hasMarketingEditAccess: (state) => ['admin', 'marketing_admin'].includes(state.profile?.role || ''),
    hasGduAccess: (state) => ['admin', 'marketing_admin'].includes(state.profile?.role || ''),
    hasAdminOpsAccess: (state) => state.profile?.role === 'admin',
    
    // Role tier for comparison
    roleTier: (state): number => roleHierarchy[state.profile?.role || 'user'] || 10,
    
    // Display helpers
    roleDisplayName: (state): string => {
      const names: Record<string, string> = {
        admin: '⭐ System Admin',
        office_admin: '🏢 Office Admin',
        marketing_admin: '📣 Marketing Admin',
        user: 'Team Member'
      }
      return names[state.profile?.role || 'user'] || 'Team Member'
    },
    
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
        console.log('[AuthStore] Making Supabase query...')
        const startTime = Date.now()
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', authUserId)
          .single()

        console.log('[AuthStore] Query completed in', Date.now() - startTime, 'ms')
        console.log('[AuthStore] Response - data:', data, 'error:', error)

        if (error) {
          console.error('[AuthStore] Profile fetch error:', error.message, error.code, error.details)
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

    // Check if user has at least the specified role tier
    hasMinimumRole(role: UserRole): boolean {
      const requiredTier = roleHierarchy[role] || 0
      const userTier = roleHierarchy[this.profile?.role || 'user'] || 10
      return userTier >= requiredTier
    },

    canManage(): boolean {
      return this.hasManagementAccess
    },

    canEditMarketing(): boolean {
      return this.hasMarketingEditAccess
    },

    canAccessGdu(): boolean {
      return this.hasGduAccess
    },

    canAccessAdminOps(): boolean {
      return this.hasAdminOpsAccess
    },

    $reset() {
      this.profile = null
      this.isLoading = false
      this.error = null
      this.initialized = false
    }
  }
})
