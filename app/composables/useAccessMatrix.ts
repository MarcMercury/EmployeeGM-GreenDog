/**
 * useAccessMatrix Composable
 * 
 * Manages page-level access control with database integration.
 * Used by the User Management Access Matrix tab and RBAC middleware.
 * 
 * Usage:
 * const { 
 *   roles, pages, accessMap, 
 *   loadAccessMatrix, updateAccess, saveRole 
 * } = useAccessMatrix()
 */

import type { UserRole } from '~/types'

export interface RoleDefinition {
  id: string
  role_key: string
  display_name: string
  description: string
  tier: number
  permissions: Record<string, any>
  icon: string
  color: string
  created_at: string
  updated_at: string
}

export interface PageDefinition {
  id: string
  path: string
  name: string
  section: string
  icon: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PageAccess {
  id: string
  page_id: string
  role_key: string
  access_level: 'full' | 'view' | 'none'
  created_at: string
  updated_at: string
}

export type AccessLevel = 'full' | 'view' | 'none'

// Build a map of page_id -> role_key -> access_level for quick lookups
export type AccessMap = Map<string, Map<string, AccessLevel>>

// Group pages by section
export interface PageSection {
  name: string
  icon: string
  pages: PageDefinition[]
}

export function useAccessMatrix() {
  const supabase = useSupabaseClient()
  
  // State
  const roles = ref<RoleDefinition[]>([])
  const pages = ref<PageDefinition[]>([])
  const accessRecords = ref<PageAccess[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  
  // Computed: Build access map for quick lookups
  const accessMap = computed<AccessMap>(() => {
    const map = new Map<string, Map<string, AccessLevel>>()
    
    for (const record of accessRecords.value) {
      if (!map.has(record.page_id)) {
        map.set(record.page_id, new Map())
      }
      map.get(record.page_id)!.set(record.role_key, record.access_level)
    }
    
    return map
  })
  
  // Computed: Group pages by section
  const pageSections = computed<PageSection[]>(() => {
    const sectionMap = new Map<string, PageDefinition[]>()
    const sectionIcons: Record<string, string> = {
      'Dashboard & Profile': 'mdi-view-dashboard',
      'Contact List': 'mdi-account-group',
      'Operations': 'mdi-calendar-clock',
      'Recruiting': 'mdi-account-search',
      'Marketing': 'mdi-bullhorn',
      'CRM & Analytics': 'mdi-chart-box',
      'GDU (Education)': 'mdi-school',
      'Admin & Settings': 'mdi-cog'
    }
    
    for (const page of pages.value) {
      if (!sectionMap.has(page.section)) {
        sectionMap.set(page.section, [])
      }
      sectionMap.get(page.section)!.push(page)
    }
    
    // Sort sections by the first page's sort_order
    const sections = Array.from(sectionMap.entries()).map(([name, sectionPages]) => ({
      name,
      icon: sectionIcons[name] || 'mdi-folder',
      pages: sectionPages.sort((a, b) => a.sort_order - b.sort_order)
    }))
    
    return sections.sort((a, b) => {
      const aOrder = a.pages[0]?.sort_order || 0
      const bOrder = b.pages[0]?.sort_order || 0
      return aOrder - bOrder
    })
  })
  
  // Computed: Sorted roles by tier (highest first)
  const sortedRoles = computed(() => {
    return [...roles.value].sort((a, b) => b.tier - a.tier)
  })
  
  // Get access level for a page and role
  function getAccess(pageId: string, roleKey: string): AccessLevel {
    // Super admin always has full access
    if (roleKey === 'super_admin') {
      return 'full'
    }
    
    return accessMap.value.get(pageId)?.get(roleKey) || 'none'
  }
  
  // Get access level by path (for middleware use)
  function getAccessByPath(path: string, roleKey: string): AccessLevel {
    // Super admin always has full access
    if (roleKey === 'super_admin') {
      return 'full'
    }
    
    const page = pages.value.find(p => p.path === path)
    if (!page) return 'none'
    
    return getAccess(page.id, roleKey)
  }
  
  // Load all access matrix data from API
  async function loadAccessMatrix() {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/admin/access-matrix', {
        method: 'GET'
      })
      
      if (response.success) {
        roles.value = response.data.roles
        pages.value = response.data.pages
        accessRecords.value = response.data.access
      }
    } catch (err: any) {
      console.error('Failed to load access matrix:', err)
      error.value = err.message || 'Failed to load access matrix'
      
      // Fallback: Try direct database query
      await loadFromDatabase()
    } finally {
      loading.value = false
    }
  }
  
  // Fallback: Load directly from database
  async function loadFromDatabase() {
    try {
      const [rolesRes, pagesRes, accessRes] = await Promise.all([
        supabase.from('role_definitions').select('*').order('tier', { ascending: false }),
        supabase.from('page_definitions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('page_access').select('*')
      ])
      
      if (rolesRes.data) roles.value = rolesRes.data
      if (pagesRes.data) pages.value = pagesRes.data
      if (accessRes.data) accessRecords.value = accessRes.data
      
      error.value = null
    } catch (err: any) {
      console.error('Failed to load from database:', err)
      error.value = 'Failed to load access data'
    }
  }
  
  // Update access level for a page/role
  async function updateAccess(pageId: string, roleKey: string, accessLevel: AccessLevel): Promise<boolean> {
    saving.value = true
    
    try {
      const response = await $fetch('/api/admin/access-matrix', {
        method: 'POST',
        body: {
          page_id: pageId,
          role_key: roleKey,
          access_level: accessLevel
        }
      })
      
      if (response.success) {
        // Update local state
        const existingIndex = accessRecords.value.findIndex(
          r => r.page_id === pageId && r.role_key === roleKey
        )
        
        if (existingIndex >= 0) {
          accessRecords.value[existingIndex].access_level = accessLevel
        } else {
          accessRecords.value.push({
            id: response.data?.id || crypto.randomUUID(),
            page_id: pageId,
            role_key: roleKey,
            access_level: accessLevel,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
        
        return true
      }
      
      return false
    } catch (err: any) {
      console.error('Failed to update access:', err)
      error.value = err.message || 'Failed to update access'
      return false
    } finally {
      saving.value = false
    }
  }
  
  // Save a role definition
  async function saveRole(role: Partial<RoleDefinition>): Promise<boolean> {
    saving.value = true
    
    try {
      const response = await $fetch('/api/admin/access-matrix', {
        method: 'PUT',
        body: role
      })
      
      if (response.success) {
        // Update local state
        const existingIndex = roles.value.findIndex(r => r.role_key === role.role_key)
        
        if (existingIndex >= 0) {
          roles.value[existingIndex] = { ...roles.value[existingIndex], ...response.data }
        } else {
          roles.value.push(response.data)
        }
        
        // Re-sort
        roles.value.sort((a, b) => b.tier - a.tier)
        
        return true
      }
      
      return false
    } catch (err: any) {
      console.error('Failed to save role:', err)
      error.value = err.message || 'Failed to save role'
      return false
    } finally {
      saving.value = false
    }
  }
  
  // Delete a custom role
  async function deleteRole(roleKey: string): Promise<boolean> {
    saving.value = true
    
    try {
      const response = await $fetch('/api/admin/access-matrix', {
        method: 'DELETE',
        body: { role_key: roleKey }
      })
      
      if (response.success) {
        // Remove from local state
        roles.value = roles.value.filter(r => r.role_key !== roleKey)
        accessRecords.value = accessRecords.value.filter(a => a.role_key !== roleKey)
        return true
      }
      
      return false
    } catch (err: any) {
      console.error('Failed to delete role:', err)
      error.value = err.message || 'Failed to delete role'
      return false
    } finally {
      saving.value = false
    }
  }
  
  // Get count of pages a role can access
  function getRolePageCount(roleKey: string): number {
    if (roleKey === 'super_admin') {
      return pages.value.length
    }
    
    return accessRecords.value.filter(
      r => r.role_key === roleKey && r.access_level !== 'none'
    ).length
  }
  
  // Check if a role is a built-in (protected) role
  function isBuiltInRole(roleKey: string): boolean {
    return ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'].includes(roleKey)
  }
  
  // Initialize access for a new role (copy from 'user' template)
  async function initializeRoleAccess(roleKey: string): Promise<boolean> {
    const userAccess = accessRecords.value.filter(r => r.role_key === 'user')
    
    for (const access of userAccess) {
      const success = await updateAccess(access.page_id, roleKey, access.access_level)
      if (!success) return false
    }
    
    return true
  }
  
  return {
    // State
    roles,
    pages,
    accessRecords,
    loading,
    saving,
    error,
    
    // Computed
    accessMap,
    pageSections,
    sortedRoles,
    
    // Methods
    getAccess,
    getAccessByPath,
    loadAccessMatrix,
    loadFromDatabase,
    updateAccess,
    saveRole,
    deleteRole,
    getRolePageCount,
    isBuiltInRole,
    initializeRoleAccess
  }
}
