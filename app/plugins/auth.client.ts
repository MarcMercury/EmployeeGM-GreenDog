// Simple auth plugin - just loads profile data when there's a session
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
    }
    
    authStore.initialized = true
  }
})
