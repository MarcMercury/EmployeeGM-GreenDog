/**
 * RBAC Middleware - Role-Based Access Control
 * 
 * Unified middleware that handles all route-level permission checks.
 * Relies on auth.ts middleware having populated authStore.profile.
 * Uses SECTION_ACCESS from ~/types as the single source of truth.
 *
 * Usage in pages:
 * definePageMeta({
 *   middleware: ['auth', 'rbac'],
 *   requiredSection: 'hr'  // or 'marketing', 'recruiting', etc.
 * })
 *
 * Sections: hr, recruiting, marketing, education, schedules_manage, schedules_view, admin, crm_analytics
 */

import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

// Path-based section mapping for routes without requiredSection meta.
// Paths use trailing-slash or end-of-string to prevent over-matching
// (e.g. '/admin' should not match '/admin-tools').
const PATH_SECTION_MAP: Array<{ pattern: RegExp; section: string }> = [
  { pattern: /^\/admin(\/|$)/, section: 'admin' },
  { pattern: /^\/settings(\/|$)/, section: 'admin' },
  { pattern: /^\/recruiting(\/|$)/, section: 'recruiting' },
  { pattern: /^\/marketing(\/|$)/, section: 'marketing' },
  { pattern: /^\/growth(\/|$)/, section: 'marketing' },
  { pattern: /^\/gdu(\/|$)/, section: 'education' },
  { pattern: /^\/academy(\/|$)/, section: 'education' },
  { pattern: /^\/schedule\/builder(\/|$)/, section: 'schedules_manage' },
  { pattern: /^\/schedule\/templates(\/|$)/, section: 'schedules_manage' },
  // HR routes — roster, people, employees with sub-paths
  { pattern: /^\/roster(\/|$)/, section: 'hr' },
  { pattern: /^\/people(\/|$)/, section: 'hr' },
  { pattern: /^\/employees\/[^/]+/, section: 'hr' },
]

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // auth.ts should have populated the profile — fail closed if missing
  if (!authStore.profile) {
    return navigateTo('/auth/login')
  }

  const userRole = (authStore.profile.role as UserRole) || 'user'

  // 1. Check route-level section requirement (explicit meta takes priority)
  const requiredSection = to.meta.requiredSection as string | undefined

  if (requiredSection && SECTION_ACCESS[requiredSection]) {
    if (!SECTION_ACCESS[requiredSection].includes(userRole)) {
      console.warn(`[RBAC] Access denied to ${to.path} for role ${userRole}. Required section: ${requiredSection}`)
      return navigateTo('/')
    }
    return // Explicit section matched and passed — allow access
  }

  // 2. Path-based fallback for pages without requiredSection meta
  const path = to.path

  for (const { pattern, section } of PATH_SECTION_MAP) {
    if (pattern.test(path)) {
      if (!SECTION_ACCESS[section].includes(userRole)) {
        console.warn(`[RBAC] Access denied to ${path} for role ${userRole}. Matched section: ${section}`)
        return navigateTo('/')
      }
      return // Matched a path rule and passed — allow access
    }
  }

  // 3. Fail-closed: routes not covered by meta or path rules are denied.
  // Only my_workspace and med_ops routes (which are accessible to all authenticated users)
  // should be reachable without explicit section assignment.
  // If a route reaches here, it has no section mapping — deny by default.
  // To whitelist a route, add requiredSection: 'my_workspace' or 'med_ops' in definePageMeta.
  console.warn(`[RBAC] No section mapping for ${path} — denying access for role ${userRole}. Add requiredSection meta to the page.`)
  return navigateTo('/')
})
