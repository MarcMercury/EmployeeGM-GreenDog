/**
 * RBAC Middleware - Role-Based Access Control
 * 
 * This is a unified middleware factory that handles all route-level permission checks.
 * It replaces the individual role-specific middlewares for a cleaner architecture.
 * 
 * Usage in pages:
 * definePageMeta({
 *   middleware: ['auth', 'rbac'],
 *   requiredSection: 'hr'  // or 'marketing', 'recruiting', etc.
 * })
 * 
 * Sections (matching SECTION_ACCESS in types/index.ts):
 * - hr: Employee profiles, skills, reviews (all roles have some access)
 * - recruiting: Candidates, pipelines, onboarding (NOT marketing_admin or user)
 * - marketing: CRM, campaigns, leads, partners (office_admin/user: view only)
 * - marketing_full: Full marketing access (edit/manage)
 * - crm: CRM & Analytics (NOT hr_admin, office_admin, user)
 * - education: GDU, courses, CE events (NOT office_admin or user)
 * - schedules_manage: Create/edit schedules
 * - schedules_view: Read-only schedule access
 * - admin: System settings, integrations
 */

import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

// View-only paths for marketing section (office_admin and user can view these)
const MARKETING_VIEW_ONLY_PATHS = ['/marketing/calendar', '/marketing/resources']

// Full marketing access paths (require marketing_full access)
const MARKETING_FULL_PATHS = [
  '/marketing/command-center',
  '/marketing/partners',
  '/marketing/influencers',
  '/marketing/inventory',
  '/marketing/ezyvet-crm',
  '/marketing/ezyvet-analytics',
  '/marketing/partnerships',
  '/marketing/list-hygiene'
]

// CRM & Analytics paths (require crm access)
const CRM_PATHS = [
  '/marketing/ezyvet-crm',
  '/marketing/ezyvet-analytics',
  '/marketing/partnerships',
  '/growth/leads'
]

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Get user role from database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single()
  
  if (error || !profile) {
    console.error('[RBAC] Failed to fetch profile:', error?.message)
    return navigateTo('/auth/login')
  }
  
  const userRole = (profile.role as UserRole) || 'user'
  
  // Super admin and admin always have access
  if (['super_admin', 'admin'].includes(userRole)) {
    return // Allow access
  }
  
  // Check route-level section requirement
  const requiredSection = to.meta.requiredSection as string | undefined
  
  if (requiredSection && SECTION_ACCESS[requiredSection]) {
    const allowedRoles = SECTION_ACCESS[requiredSection]
    
    if (!allowedRoles.includes(userRole)) {
      console.warn(`[RBAC] Access denied to ${to.path} for role ${userRole}. Required: ${allowedRoles.join(', ')}`)
      return navigateTo('/')
    }
  }
  
  // Route path-based checks (fallback for pages without requiredSection meta)
  const path = to.path
  
  // HR routes: /roster/*, /people/*, /employees/*
  if (path.startsWith('/roster/') || path.startsWith('/people/') || path.match(/^\/employees\/[^/]+/)) {
    // View is allowed for most, edit requires HR access with full permissions
    // Marketing_admin and user have view-only access per the matrix
    if (to.query.edit === 'true') {
      const editRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']
      if (!editRoles.includes(userRole)) {
        console.warn(`[RBAC] HR edit access denied for ${userRole}`)
        return navigateTo('/')
      }
    }
  }
  
  // Recruiting routes: /recruiting/*
  // Per Access Matrix: NOT marketing_admin or user
  if (path.startsWith('/recruiting')) {
    if (!SECTION_ACCESS.recruiting.includes(userRole)) {
      console.warn(`[RBAC] Recruiting access denied for ${userRole}`)
      return navigateTo('/')
    }
  }
  
  // Marketing routes: /marketing/*, /growth/*
  // Nuanced access: office_admin and user only get view access to calendar/resources
  if (path.startsWith('/marketing') || path.startsWith('/growth')) {
    // Check if this is a CRM path (more restricted)
    if (CRM_PATHS.some(p => path.startsWith(p))) {
      if (!SECTION_ACCESS.crm?.includes(userRole)) {
        console.warn(`[RBAC] CRM access denied for ${userRole}`)
        return navigateTo('/')
      }
    }
    // Check if this is a full-access marketing path
    else if (MARKETING_FULL_PATHS.some(p => path.startsWith(p))) {
      if (!SECTION_ACCESS.marketing_full?.includes(userRole)) {
        console.warn(`[RBAC] Marketing full access denied for ${userRole}`)
        return navigateTo('/')
      }
    }
    // Check if this is a view-only marketing path
    else if (MARKETING_VIEW_ONLY_PATHS.some(p => path.startsWith(p))) {
      if (!SECTION_ACCESS.marketing.includes(userRole)) {
        console.warn(`[RBAC] Marketing view access denied for ${userRole}`)
        return navigateTo('/')
      }
    }
    // Default marketing access check
    else if (!SECTION_ACCESS.marketing.includes(userRole)) {
      console.warn(`[RBAC] Marketing access denied for ${userRole}`)
      return navigateTo('/')
    }
  }
  
  // GDU/Education routes: /gdu/*, /academy/*
  // Per Access Matrix: NOT office_admin or user
  if (path.startsWith('/gdu') || path.startsWith('/academy')) {
    if (!SECTION_ACCESS.education.includes(userRole)) {
      console.warn(`[RBAC] Education access denied for ${userRole}`)
      return navigateTo('/')
    }
  }
  
  // Schedule management routes: /schedule/builder, /schedule/templates
  if (path.includes('/schedule/builder') || path.includes('/schedule/templates')) {
    if (!SECTION_ACCESS.schedules_manage.includes(userRole)) {
      console.warn(`[RBAC] Schedule management access denied for ${userRole}`)
      return navigateTo('/')
    }
  }
  
  // Admin routes: /admin/*, /settings/*
  if (path.startsWith('/admin') || path.startsWith('/settings')) {
    if (!SECTION_ACCESS.admin.includes(userRole)) {
      console.warn(`[RBAC] Admin access denied for ${userRole}`)
      return navigateTo('/')
    }
  }
  
  // Allow access by default for routes not covered above
})
