// Auth initialization plugin - runs on client only
export default defineNuxtPlugin(async (nuxtApp) => {
  const supabase = nuxtApp.$supabase as any
  const authStore = useAuthStore()
  const userStore = useUserStore()

  if (!supabase) {
    console.error('[AuthPlugin] Supabase client not available')
    return
  }

  // Watch for auth state changes
  supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    console.log('[AuthPlugin] Auth state changed:', event, 'User:', session?.user?.email)
    
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      // Fetch profile when user signs in - pass user ID directly from session
      console.log('[AuthPlugin] Fetching profile for user ID:', session.user.id)
      await authStore.fetchProfile(session.user.id)
      await userStore.fetchUserData()
    } else if (event === 'SIGNED_OUT') {
      // Clear stores on sign out
      authStore.$reset()
      userStore.clearUser()
    }
  })

  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Initialize auth state if user is already logged in
  if (session?.user) {
    console.log('[AuthPlugin] Existing session found for:', session.user.email)
    if (!authStore.profile) {
      await authStore.fetchProfile(session.user.id)
    }
    if (!userStore.profile) {
      await userStore.fetchUserData()
    }
  }
  
  authStore.initialized = true
})
