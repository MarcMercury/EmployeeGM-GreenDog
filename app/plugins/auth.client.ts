// Auth initialization plugin - runs on client only
export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()
  const user = useSupabaseUser()

  // Watch for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event)
    
    if (event === 'SIGNED_IN' && session?.user) {
      // Fetch profile when user signs in
      await authStore.fetchProfile()
    } else if (event === 'SIGNED_OUT') {
      // Clear profile on sign out
      authStore.$reset()
    }
  })

  // Initialize auth state if user is already logged in
  if (user.value && !authStore.profile) {
    await authStore.fetchProfile()
  }
  
  authStore.initialized = true
})
