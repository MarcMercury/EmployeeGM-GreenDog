/**
 * API: /api/user/page-access
 * 
 * Public endpoint for any authenticated user to get their page access levels.
 * Used by the sidebar to determine which pages to show.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Get user session
  const supabase = await serverSupabaseClient(event)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Use service role to bypass RLS for getting profile and access data
  const supabaseAdmin = await serverSupabaseServiceRole(event)

  // Get user's role from profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const userRole = profile.role

  // Super admin always has full access to everything
  if (userRole === 'super_admin') {
    const { data: pages } = await supabaseAdmin
      .from('page_definitions')
      .select('id, path, name, section, sort_order')
      .eq('is_active', true)
      .order('sort_order')

    return {
      success: true,
      role: userRole,
      pages: pages?.map(p => ({
        ...p,
        access_level: 'full'
      })) || []
    }
  }

  // For other roles, fetch their specific access levels
  const { data: pages, error: pagesError } = await supabaseAdmin
    .from('page_definitions')
    .select(`
      id,
      path,
      name,
      section,
      sort_order,
      page_access!left (
        access_level
      )
    `)
    .eq('is_active', true)
    .eq('page_access.role_key', userRole)
    .order('sort_order')

  if (pagesError) {
    console.error('Error fetching page access:', pagesError)
    throw createError({ statusCode: 500, message: 'Failed to fetch page access' })
  }

  // Transform the data to flatten the access level
  const pagesWithAccess = pages?.map(page => {
    const accessRecord = page.page_access?.[0]
    return {
      id: page.id,
      path: page.path,
      name: page.name,
      section: page.section,
      sort_order: page.sort_order,
      access_level: accessRecord?.access_level || 'none'
    }
  }) || []

  return {
    success: true,
    role: userRole,
    pages: pagesWithAccess
  }
})
