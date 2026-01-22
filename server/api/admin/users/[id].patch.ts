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
  try {
    const userId = getRouterParam(event, 'id')
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'Missing user ID'
      })
    }

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
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Create admin client
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

  if (profileError || callerProfile?.role !== 'super_admin') {
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
  
  // Default valid roles
  let validRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user']
  
  // Try to fetch valid roles from database (non-blocking if table doesn't exist)
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('role_definitions')
      .select('role_key')
    
    if (!roleError && roleData?.length) {
      validRoles = roleData.map(r => r.role_key)
      console.log('[Admin Users PATCH] Loaded roles from database:', validRoles)
    } else if (roleError) {
      console.log('[Admin Users PATCH] Could not fetch role_definitions, using defaults:', roleError.message)
    }
  } catch (e) {
    console.log('[Admin Users PATCH] role_definitions query failed, using defaults')
  }
  
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Validate role if changing it
      if (field === 'role' && !validRoles.includes(body[field])) {
        throw createError({
          statusCode: 400,
          message: `Invalid role: ${body[field]}`
        })
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

  // Update the profile
  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating user:', updateError)
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
  } catch (error: any) {
    // If it's already a createError, re-throw
    if (error.statusCode) {
      throw error
    }
    // Otherwise, log and return a 500
    console.error('[Admin Users PATCH] Unhandled error:', error)
    throw createError({
      statusCode: 500,
      message: `Server error: ${error.message || 'Unknown error'}`
    })
  }
})
