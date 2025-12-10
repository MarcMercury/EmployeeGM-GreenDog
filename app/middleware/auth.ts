export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  
  // Allow access to auth pages
  if (to.path.startsWith('/auth')) {
    // If already logged in, redirect to home
    if (user.value) {
      return navigateTo('/')
    }
    return
  }

  // Require authentication for all other pages
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
