/**
 * API: /api/admin/access-matrix
 * 
 * Manages page access control for roles
 * GET - Fetch all page definitions and access levels
 * POST - Update access levels for a role
 * PUT - Create or update a role
 */

import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Use service role for database operations (bypasses RLS)
  const supabaseAdmin = await serverSupabaseServiceRole(event)
  
  // Get user session via client-side supabase
  const supabase = await serverSupabaseClient(event)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  console.log('[access-matrix] User check via getUser:', user?.id || 'no user', 'error:', userError?.message)

  if (!user) {
    // Try to get session from cookies directly
    const cookies = parseCookies(event)
    const accessToken = cookies['sb-access-token'] || cookies['sb-uekumyupkhnpjpdcjfxb-auth-token']
    console.log('[access-matrix] Cookie tokens available:', !!cookies['sb-access-token'], !!cookies['sb-uekumyupkhnpjpdcjfxb-auth-token'])
    
    if (!accessToken) {
      console.log('[access-matrix] No user session found')
      throw createError({ statusCode: 401, message: 'Unauthorized - no session' })
    }
  }

  // Verify user is admin using auth_user_id
  const authUserId = user?.id
  if (!authUserId) {
    throw createError({ statusCode: 401, message: 'Unauthorized - no auth user id' })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single()

  console.log('[access-matrix] Profile check:', profile?.role, 'error:', profileError?.message)

  if (profileError || !profile) {
    throw createError({ statusCode: 401, message: 'Profile not found' })
  }

  // Allow both admin and super_admin to manage access matrix
  if (!['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const method = event.method

  // GET - Fetch access matrix data
  if (method === 'GET') {
    try {
      // Fetch role definitions
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('role_definitions')
        .select('*')
        .order('tier', { ascending: false })

      if (rolesError) {
        console.error('Error fetching roles:', rolesError)
        throw createError({ statusCode: 500, message: 'Failed to fetch roles' })
      }

      // Fetch page definitions
      const { data: pages, error: pagesError } = await supabaseAdmin
        .from('page_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (pagesError) {
        console.error('Error fetching pages:', pagesError)
        throw createError({ statusCode: 500, message: 'Failed to fetch pages' })
      }

      // Fetch page access
      const { data: access, error: accessError } = await supabaseAdmin
        .from('page_access')
        .select('*')

      if (accessError) {
        console.error('Error fetching access:', accessError)
        throw createError({ statusCode: 500, message: 'Failed to fetch access levels' })
      }

      return {
        success: true,
        data: {
          roles: roles || [],
          pages: pages || [],
          access: access || []
        }
      }
    } catch (error) {
      console.error('Error in GET /api/admin/access-matrix:', error)
      throw createError({ statusCode: 500, message: 'Internal server error' })
    }
  }

  // POST - Update access levels
  if (method === 'POST') {
    try {
      const body = await readBody(event)
      const { page_id, role_key, access_level } = body

      if (!page_id || !role_key || !access_level) {
        throw createError({ statusCode: 400, message: 'Missing required fields: page_id, role_key, access_level' })
      }

      if (!['full', 'view', 'none'].includes(access_level)) {
        throw createError({ statusCode: 400, message: 'Invalid access_level. Must be: full, view, or none' })
      }

      // Upsert the access record
      const { data, error } = await supabaseAdmin
        .from('page_access')
        .upsert({
          page_id,
          role_key,
          access_level,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'page_id,role_key'
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating access:', error)
        throw createError({ statusCode: 500, message: 'Failed to update access level' })
      }

      return {
        success: true,
        message: 'Access level updated',
        data
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      console.error('Error in POST /api/admin/access-matrix:', error)
      throw createError({ statusCode: 500, message: 'Internal server error' })
    }
  }

  // PUT - Create or update a role
  if (method === 'PUT') {
    try {
      const body = await readBody(event)
      const { role_key, display_name, description, tier, icon, color, permissions } = body

      if (!role_key || !display_name) {
        throw createError({ statusCode: 400, message: 'Missing required fields: role_key, display_name' })
      }

      // Validate role_key format (lowercase, underscores only)
      if (!/^[a-z_]+$/.test(role_key)) {
        throw createError({ statusCode: 400, message: 'role_key must be lowercase letters and underscores only' })
      }

      // Upsert the role
      const { data, error } = await supabaseAdmin
        .from('role_definitions')
        .upsert({
          role_key,
          display_name,
          description: description || '',
          tier: tier || 10,
          icon: icon || 'mdi-account',
          color: color || 'grey',
          permissions: permissions || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'role_key'
        })
        .select()
        .single()

      if (error) {
        console.error('Error upserting role:', error)
        throw createError({ statusCode: 500, message: 'Failed to save role' })
      }

      return {
        success: true,
        message: 'Role saved successfully',
        data
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      console.error('Error in PUT /api/admin/access-matrix:', error)
      throw createError({ statusCode: 500, message: 'Internal server error' })
    }
  }

  // DELETE - Remove a custom role (protect built-in roles)
  if (method === 'DELETE') {
    try {
      const body = await readBody(event)
      const { role_key } = body

      if (!role_key) {
        throw createError({ statusCode: 400, message: 'Missing required field: role_key' })
      }

      // Protect built-in roles
      const protectedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user']
      if (protectedRoles.includes(role_key)) {
        throw createError({ statusCode: 400, message: 'Cannot delete built-in roles' })
      }

      // Check if any users have this role
      const { data: usersWithRole, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', role_key)
        .limit(1)

      if (checkError) {
        throw createError({ statusCode: 500, message: 'Failed to check role usage' })
      }

      if (usersWithRole && usersWithRole.length > 0) {
        throw createError({ statusCode: 400, message: 'Cannot delete role that is assigned to users' })
      }

      // Delete page access for this role
      await supabaseAdmin
        .from('page_access')
        .delete()
        .eq('role_key', role_key)

      // Delete the role
      const { error } = await supabaseAdmin
        .from('role_definitions')
        .delete()
        .eq('role_key', role_key)

      if (error) {
        console.error('Error deleting role:', error)
        throw createError({ statusCode: 500, message: 'Failed to delete role' })
      }

      return {
        success: true,
        message: 'Role deleted successfully'
      }
    } catch (error: any) {
      if (error.statusCode) throw error
      console.error('Error in DELETE /api/admin/access-matrix:', error)
      throw createError({ statusCode: 500, message: 'Internal server error' })
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
