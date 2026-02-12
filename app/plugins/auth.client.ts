// Auth plugin - loads profile data and handles session state changes

/** Race a promise against a timeout. Resolves to the fallback on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ])
}

const INIT_TIMEOUT = 5_000 // 5 s max for initial session check

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

    // Check for emergency admin session first
    const { isEmergencyMode, profile: emergencyProfile } = useEmergencyAuth()
    if (isEmergencyMode.value && emergencyProfile.value) {
      console.log('[AuthPlugin] Emergency admin session detected — skipping Supabase auth')
      authStore.profile = emergencyProfile.value as any
      authStore.initialized = true

      // Set the @nuxtjs/supabase internal user state so its redirect middleware
      // doesn't kick us back to /auth/login when Supabase is unreachable.
      const supabaseUser = useState<any>('supabase_user')
      supabaseUser.value = {
        id: emergencyProfile.value.auth_user_id,
        email: emergencyProfile.value.email,
        app_metadata: {},
        user_metadata: {
          first_name: emergencyProfile.value.first_name,
          last_name: emergencyProfile.value.last_name,
        },
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
      }

      return
    }

    // Track state to prevent redundant operations
    let lastProcessedUserId: string | null = null
    let lastLoginUpdatedAt = 0
    let isProcessingAuthChange = false
    const LOGIN_UPDATE_THROTTLE = 60 * 1000 // Only update last_login once per minute max

    // Check for existing session and load profile
    // Use a timeout so the app still renders if Supabase is unreachable
    let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
    try {
      const result = await withTimeout(
        supabase.auth.getSession(),
        INIT_TIMEOUT,
        { data: { session: null }, error: { message: 'Supabase unreachable (timeout)' } as any }
      )
      session = result.data.session
      if (result.error) {
        console.warn('[AuthPlugin] Session check failed:', result.error.message)
      }
    } catch (err) {
      console.warn('[AuthPlugin] Session check threw:', err)
    }
    
    if (session?.user) {
      console.log('[AuthPlugin] Session found, loading profile...')
      // Profile fetch is also guarded by a timeout so we never block forever
      try {
        await withTimeout(
          Promise.all([
            authStore.fetchProfile(session.user.id),
            userStore.fetchUserData()
          ]),
          INIT_TIMEOUT,
          undefined
        )
      } catch (err) {
        console.warn('[AuthPlugin] Profile/user fetch failed:', err)
      }
      lastProcessedUserId = session.user.id
      
      // Update last_login_at in profiles to track "last seen" 
      // (Supabase's last_sign_in_at only updates on actual authentication, not session restore)
      // Fire-and-forget — never block plugin setup
      supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('auth_user_id', session.user.id)
        .select('id')
        .then(({ data, error }) => {
          if (error) {
            console.warn('[AuthPlugin] Failed to update last_login_at:', error.message)
          } else if (!data || data.length === 0) {
            console.warn('[AuthPlugin] No profile found to update last_login_at for auth_user_id:', session!.user.id)
          } else {
            console.log('[AuthPlugin] Updated last_login_at')
            lastLoginUpdatedAt = Date.now()
          }
        })
        .catch((err: unknown) => {
          console.warn('[AuthPlugin] Failed to update last_login_at:', err)
        })
    }
    
    authStore.initialized = true

    // Set up auth state change listener for session refresh
    // This handles token refresh, sign in/out events, and password recovery
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Prevent concurrent processing of auth events
      if (isProcessingAuthChange) {
        console.log('[AuthPlugin] Auth event ignored (already processing):', event)
        return
      }
      
      console.log('[AuthPlugin] Auth state changed:', event)
      
      switch (event) {
        case 'SIGNED_IN':
          // SIGNED_IN fires on initial sign-in AND token refresh
          // Skip if we've already processed this user
          if (newSession?.user?.id === lastProcessedUserId && authStore.profile) {
            console.log('[AuthPlugin] SIGNED_IN for same user with profile loaded, skipping')
            return
          }
          
          if (newSession?.user && !authStore.profile) {
            isProcessingAuthChange = true
            try {
              console.log('[AuthPlugin] Loading profile after sign in...')
              await authStore.fetchProfile(newSession.user.id)
              await userStore.fetchUserData()
              lastProcessedUserId = newSession.user.id
              
              // Update last_login_at only if we haven't recently
              const now = Date.now()
              if (now - lastLoginUpdatedAt > LOGIN_UPDATE_THROTTLE) {
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ last_login_at: new Date().toISOString() })
                    .eq('auth_user_id', newSession.user.id)
                  
                  if (error) {
                    console.warn('[AuthPlugin] Failed to update last_login_at on sign-in:', error.message)
                  } else {
                    console.log('[AuthPlugin] Updated last_login_at on sign-in')
                    lastLoginUpdatedAt = now
                  }
                } catch (err) {
                  console.warn('[AuthPlugin] Error updating last_login_at on sign-in:', err)
                }
              }
            } finally {
              isProcessingAuthChange = false
            }
          } else if (newSession?.user && authStore.profile) {
            // Profile already loaded - this is likely a token refresh
            lastProcessedUserId = newSession.user.id
            console.log('[AuthPlugin] Profile already loaded (token refresh)')
          }
          break

        case 'SIGNED_OUT':
          // User signed out - clear tracking
          console.log('[AuthPlugin] User signed out')
          lastProcessedUserId = null
          lastLoginUpdatedAt = 0
          break

        case 'TOKEN_REFRESHED':
          // Session token was refreshed - just log it, no action needed
          console.log('[AuthPlugin] Token refreshed successfully')
          break

        case 'USER_UPDATED':
          // User profile was updated (email change, password change, etc.)
          if (newSession?.user) {
            isProcessingAuthChange = true
            try {
              console.log('[AuthPlugin] User updated, refreshing profile...')
              await authStore.fetchProfile(newSession.user.id, true) // Force refresh
            } finally {
              isProcessingAuthChange = false
            }
          }
          break

        case 'PASSWORD_RECOVERY':
          // Password recovery initiated
          console.log('[AuthPlugin] Password recovery mode')
          break

        case 'INITIAL_SESSION':
          // Initial session event - already handled above, skip
          console.log('[AuthPlugin] Initial session event (already handled)')
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
            lastProcessedUserId = null
            
            // Redirect to login
            const router = useRouter()
            router.push('/auth/login')
          }
        } catch (err) {
          console.error('[AuthPlugin] Session check failed:', err)
        }
      }, SESSION_CHECK_INTERVAL)
    }
  }
})
