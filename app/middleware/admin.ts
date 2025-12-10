export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  
  // Wait for profile to load
  if (!authStore.profile) {
    await authStore.fetchProfile()
  }

  // Check if user is admin
  if (!authStore.isAdmin) {
    return navigateTo('/')
  }
})
