/**
 * POST /api/admin/users/:id/reset-password
 * 
 * Resets a user's password to a new value
 * Only super_admin can access this endpoint
 * 
 * Body: { password: string }
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'Missing user ID'
    })
  }

  const body = await readBody(event)
  const { password } = body

  if (!password || password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters'
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
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Admin Reset Password] Missing credentials:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
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
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || callerProfile?.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Super Admin access required'
    })
  }

  // Get the target user's auth_user_id from profile
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

  // Reset the user's password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetProfile.auth_user_id,
    { password }
  )

  if (updateError) {
    console.error('Error resetting password:', updateError)
    throw createError({
      statusCode: 500,
      message: `Failed to reset password: ${updateError.message}`
    })
  }

  // Log this action for audit purposes
  console.log(`[AUDIT] Password reset for user ${userId} (${targetProfile.email}) by super_admin ${callerUser.id} at ${new Date().toISOString()}`)

  return {
    success: true,
    message: 'Password reset successfully'
  }
})
