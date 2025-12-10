// Auth initialization plugin - runs on client only
export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const user = useSupabaseUser()

  // Watch for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event)
    
    if (event === 'SIGNED_IN' && session?.user) {
      // Fetch profile when user signs in
      await authStore.fetchProfile()
      await userStore.fetchUserData()
    } else if (event === 'SIGNED_OUT') {
      // Clear stores on sign out
      authStore.$reset()
      userStore.clearUser()
    }
  })

  // Initialize auth state if user is already logged in
  if (user.value) {
    if (!authStore.profile) {
      await authStore.fetchProfile()
    }
    if (!userStore.profile) {
      await userStore.fetchUserData()
    }
  }
  
  authStore.initialized = true
})
