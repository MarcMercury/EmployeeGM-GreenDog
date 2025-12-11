// Auth initialization plugin - runs on client only AFTER supabase plugin
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['supabase'],
  async setup() {
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    const route = useRoute()
    // @nuxtjs/supabase provides { client } via provide("supabase", { client })
    const supabase = (nuxtApp.$supabase as { client: ReturnType<typeof import('@supabase/supabase-js').createClient> })?.client
    const authStore = useAuthStore()
    const userStore = useUserStore()

    if (!supabase) {
      console.error('[AuthPlugin] Supabase client not available')
      return
    }

    console.log('[AuthPlugin] Initializing auth...')

    // Helper to redirect away from login page
    const redirectFromLogin = () => {
      if (window.location.pathname.startsWith('/auth/')) {
        console.log('[AuthPlugin] On auth page while logged in, redirecting to dashboard...')
        window.location.href = '/'
      }
    }

    // Watch for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthPlugin] Auth state changed:', event, 'User:', session?.user?.email)
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // IMMEDIATELY redirect if on auth page - don't wait for profile fetches
        if (window.location.pathname.startsWith('/auth/')) {
          console.log('[AuthPlugin] Logged in on auth page, redirecting NOW...')
          window.location.href = '/'
          return // Stop processing, we're redirecting
        }
        
        console.log('[AuthPlugin] Fetching profile for user ID:', session.user.id)
        await authStore.fetchProfile(session.user.id)
        await userStore.fetchUserData()
      } else if (event === 'SIGNED_OUT') {
        authStore.$reset()
        userStore.clearUser()
      }
    })

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      console.log('[AuthPlugin] Existing session found for:', session.user.email)
      
      // IMMEDIATELY redirect if on auth page
      if (window.location.pathname.startsWith('/auth/')) {
        console.log('[AuthPlugin] Already logged in on auth page, redirecting NOW...')
        window.location.href = '/'
        return // Stop plugin execution, we're redirecting
      }
      
      if (!authStore.profile) {
        await authStore.fetchProfile(session.user.id)
      }
      if (!userStore.profile) {
        await userStore.fetchUserData()
      }
    }
    
    authStore.initialized = true
    console.log('[AuthPlugin] Auth initialized, profile:', authStore.profile?.email)
  }
})
