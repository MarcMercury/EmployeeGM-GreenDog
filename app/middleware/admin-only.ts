/**
 * Admin-Only Middleware
 * Blocks non-admin users from accessing protected routes.
 * Relies on auth.ts middleware having populated authStore.profile.
 * Uses SECTION_ACCESS.admin for the canonical role list.
 *
 * Allowed roles: super_admin, admin
 */
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // auth.ts should have populated the profile — fail closed if missing
  if (!authStore.profile) {
    return navigateTo('/auth/login')
  }

  const role = (authStore.profile.role as UserRole) || 'user'

  if (!SECTION_ACCESS.admin.includes(role)) {
    console.warn('[Middleware:admin-only] Access denied for role:', role, 'to path:', to.path)
    return navigateTo('/')
  }
})
