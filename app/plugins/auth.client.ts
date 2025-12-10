// Auth initialization plugin - runs on client only AFTER supabase plugin
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['supabase'],
  async setup() {
    const nuxtApp = useNuxtApp()
    // @nuxtjs/supabase provides { client } via provide("supabase", { client })
    const supabase = (nuxtApp.$supabase as { client: ReturnType<typeof import('@supabase/supabase-js').createClient> })?.client
    const authStore = useAuthStore()
    const userStore = useUserStore()

    if (!supabase) {
      console.error('[AuthPlugin] Supabase client not available')
      return
    }

    console.log('[AuthPlugin] Initializing auth...')

    // Watch for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthPlugin] Auth state changed:', event, 'User:', session?.user?.email)
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
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
