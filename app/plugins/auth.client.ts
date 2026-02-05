// Auth plugin - loads profile data and handles session state changes
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['supabase'],
  async setup() {
    const nuxtApp = useNuxtApp()
    const supabase = (nuxtApp.$supabase as { client: ReturnType<typeof import('@supabase/supabase-js').createClient> })?.client
    const authStore = useAuthStore()
    const userStore = useUserStore()

    if (!supabase) {
      console.error('[AuthPlugin] Supabase client not available')
      return
    }

    // Check for existing session and load profile
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      console.log('[AuthPlugin] Session found, loading profile...')
      await authStore.fetchProfile(session.user.id)
      await userStore.fetchUserData()
      
      // Update last_login_at in profiles to track "last seen" 
      // (Supabase's last_sign_in_at only updates on actual authentication, not session restore)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('auth_user_id', session.user.id)
          .select('id')
        
        if (error) {
          console.warn('[AuthPlugin] Failed to update last_login_at:', error.message)
        } else if (!data || data.length === 0) {
          console.warn('[AuthPlugin] No profile found to update last_login_at for auth_user_id:', session.user.id)
        } else {
          console.log('[AuthPlugin] Updated last_login_at')
        }
      } catch (err) {
        // Non-critical - don't block auth flow
        console.warn('[AuthPlugin] Failed to update last_login_at:', err)
      }
    }
    
    authStore.initialized = true

    // Set up auth state change listener for session refresh
    // This handles token refresh, sign in/out events, and password recovery
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthPlugin] Auth state changed:', event)
      
      switch (event) {
        case 'SIGNED_IN':
          // User signed in (includes initial sign in and token refresh)
          if (newSession?.user) {
            console.log('[AuthPlugin] Loading profile after sign in...')
            if (!authStore.profile) {
              await authStore.fetchProfile(newSession.user.id)
              await userStore.fetchUserData()
            }
            
            // Update last_login_at on actual sign-in event
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('auth_user_id', newSession.user.id)
              
              if (error) {
                console.warn('[AuthPlugin] Failed to update last_login_at on sign-in:', error.message)
              } else {
                console.log('[AuthPlugin] Updated last_login_at on sign-in')
              }
            } catch (err) {
              console.warn('[AuthPlugin] Error updating last_login_at on sign-in:', err)
            }
          }
          break

        case 'SIGNED_OUT':
          // User signed out - stores are reset in authStore.signOut()
          // Also update last_login_at to mark the logout time
          console.log('[AuthPlugin] User signed out')
          break

        case 'TOKEN_REFRESHED':
          // Session token was refreshed - just log it
          console.log('[AuthPlugin] Token refreshed successfully')
          break

        case 'USER_UPDATED':
          // User profile was updated (email change, password change, etc.)
          if (newSession?.user) {
            console.log('[AuthPlugin] User updated, refreshing profile...')
            await authStore.fetchProfile(newSession.user.id)
          }
          break

        case 'PASSWORD_RECOVERY':
          // Password recovery initiated
          console.log('[AuthPlugin] Password recovery mode')
          break

        default:
          // Handle any other events
          console.log('[AuthPlugin] Unhandled auth event:', event)
      }
    })

    // Periodic session check to detect expired sessions
    // Runs every 5 minutes to proactively refresh if needed
    if (typeof window !== 'undefined') {
      const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
      
      setInterval(async () => {
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.warn('[AuthPlugin] Session check error:', error.message)
            return
          }

          if (!currentSession && authStore.profile) {
            // Session expired but we still have profile data - force sign out
            console.warn('[AuthPlugin] Session expired, signing out...')
            await authStore.signOut()
            
            // Redirect to login
            const router = useRouter()
            router.push('/login')
          }
        } catch (err) {
          console.error('[AuthPlugin] Session check failed:', err)
        }
      }, SESSION_CHECK_INTERVAL)
    }
  }
})
