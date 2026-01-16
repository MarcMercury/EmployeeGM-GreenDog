/**
 * POST /api/admin/users/:id/toggle-active
 * 
 * Toggles a user's active status (enable/disable login)
 * Only super_admin can access this endpoint
 * 
 * Body: { is_active: boolean }
 */

import { createClient } from '@supabase/supabase-js'

const LOCKED_PASSWORD = 'GDDGDD2026_DISABLED'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'Missing user ID'
    })
  }

  const body = await readBody(event)
  const { is_active } = body

  if (typeof is_active !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'is_active must be a boolean'
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
    console.error('[Admin Toggle Active] Missing credentials:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
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

  // Get the target user's info
  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('auth_user_id, email')
    .eq('id', userId)
    .single()

  if (targetError || !targetProfile?.auth_user_id) {
    throw createError({
      statusCode: 404,
      message: 'User not found or has no auth account'
    })
  }

  // Don't allow disabling your own account
  if (targetProfile.auth_user_id === callerUser.id) {
    throw createError({
      statusCode: 400,
      message: 'Cannot disable your own account'
    })
  }

  // Update is_active in profiles table
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileUpdateError) {
    console.error('Error updating profile:', profileUpdateError)
    throw createError({
      statusCode: 500,
      message: `Failed to update user: ${profileUpdateError.message}`
    })
  }

  // If disabling, also set the password to a locked value
  // If enabling, we don't change the password - admin should use reset-password if needed
  if (!is_active) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetProfile.auth_user_id,
      { password: LOCKED_PASSWORD }
    )

    if (authUpdateError) {
      console.error('Error updating auth user:', authUpdateError)
      // Revert profile change
      await supabaseAdmin
        .from('profiles')
        .update({ is_active: !is_active })
        .eq('id', userId)
      
      throw createError({
        statusCode: 500,
        message: `Failed to ${is_active ? 'enable' : 'disable'} login: ${authUpdateError.message}`
      })
    }
  }

  // Log this action for audit purposes
  console.log(`[AUDIT] User ${userId} (${targetProfile.email}) ${is_active ? 'enabled' : 'disabled'} by super_admin ${callerUser.id} at ${new Date().toISOString()}`)

  return {
    success: true,
    message: `User ${is_active ? 'enabled' : 'disabled'} successfully`
  }
})
