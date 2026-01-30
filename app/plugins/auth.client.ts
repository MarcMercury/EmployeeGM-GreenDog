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
      
      // Update last_login_at in profiles to track "last seen" 
      // (Supabase's last_sign_in_at only updates on actual authentication, not session restore)
      try {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('auth_user_id', session.user.id)
        console.log('[AuthPlugin] Updated last_login_at')
      } catch (err) {
        // Non-critical - don't block auth flow
        console.warn('[AuthPlugin] Failed to update last_login_at:', err)
      }
    }
    
    authStore.initialized = true
  }
})
