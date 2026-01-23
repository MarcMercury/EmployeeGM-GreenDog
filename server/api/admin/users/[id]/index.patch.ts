/**
 * PATCH /api/admin/users/:id
 * 
 * Updates a user's profile (role, active status, etc.)
 * Only super_admin can access this endpoint
 * 
 * Body: { role?: string, is_active?: boolean, first_name?: string, last_name?: string, phone?: string }
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  
  console.log('[Admin Users PATCH] Starting request for userId:', userId)
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'Missing user ID'
    })
  }

  // Parse request body
  let body: Record<string, any>
  try {
    body = await readBody(event)
    console.log('[Admin Users PATCH] Request body:', JSON.stringify(body))
  } catch (e) {
    console.error('[Admin Users PATCH] Failed to parse body:', e)
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[Admin Users PATCH] No auth header')
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Admin Users PATCH] Missing credentials:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || process.env.NUXT_PUBLIC_SUPABASE_KEY || '')
  
  // Verify the caller's token
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  
  if (authError || !callerUser) {
    console.log('[Admin Users PATCH] Auth error:', authError?.message)
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Create admin client with service role key (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Check if caller is super_admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, id')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError) {
    console.error('[Admin Users PATCH] Profile fetch error:', profileError)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch caller profile'
    })
  }

  if (callerProfile?.role !== 'super_admin') {
    console.log('[Admin Users PATCH] Access denied - role is:', callerProfile?.role)
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Super Admin access required'
    })
  }

  // Don't allow editing your own role (prevent lockout)
  if (userId === callerProfile.id && body.role && body.role !== 'super_admin') {
    throw createError({
      statusCode: 400,
      message: 'Cannot change your own role - this could lock you out'
    })
  }

  // Build update object with only allowed fields
  const allowedFields = ['role', 'is_active', 'first_name', 'last_name', 'phone']
  
  // Fetch valid roles from the database (role_definitions table)
  let validRoles: string[] = ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'sup_admin', 'user']
  
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('role_definitions')
      .select('role_key')
    
    if (roleError) {
      console.warn('[Admin Users PATCH] Could not fetch roles from DB, using defaults:', roleError.message)
    } else if (roleData && roleData.length > 0) {
      validRoles = roleData.map(r => r.role_key)
      console.log('[Admin Users PATCH] Loaded', validRoles.length, 'roles from database')
    }
  } catch (e: any) {
    console.warn('[Admin Users PATCH] Exception fetching roles, using defaults:', e.message)
  }
  
  // validRoles already has defaults, no need for else block
  
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Validate role if changing it
      if (field === 'role') {
        if (!validRoles.includes(body[field])) {
          console.log('[Admin Users PATCH] Invalid role:', body[field], 'Valid roles:', validRoles)
          throw createError({
            statusCode: 400,
            message: `Invalid role: ${body[field]}. Valid roles are: ${validRoles.join(', ')}`
          })
        }
      }
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update'
    })
  }

  updateData.updated_at = new Date().toISOString()

  console.log('[Admin Users PATCH] Updating profile', userId, 'with:', updateData)

  // Update the profile
  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('[Admin Users PATCH] Update error:', updateError)
    throw createError({
      statusCode: 500,
      message: `Failed to update user: ${updateError.message}`
    })
  }

  // Log this action for audit purposes
  console.log(`[AUDIT] User ${userId} updated by super_admin ${callerUser.id} at ${new Date().toISOString()}:`, updateData)

  return {
    success: true,
    user: updatedProfile,
    message: 'User updated successfully'
  }
})
