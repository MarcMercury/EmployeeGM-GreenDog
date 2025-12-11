/**
 * Admin-Only Middleware
 * Blocks non-admin users from accessing protected routes
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAdmin, currentUserProfile, fetchGlobalData } = useAppData()
  const toast = useToast()
  
  // Ensure data is loaded
  if (!currentUserProfile.value) {
    await fetchGlobalData()
  }
  
  // Check admin status
  if (!isAdmin.value) {
    toast.error('Unauthorized: Admin access required')
    return navigateTo('/')
  }
})
