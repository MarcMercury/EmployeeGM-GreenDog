/**
 * POST /api/admin/disable-login
 * 
 * Changes a user's password to a locked password, effectively disabling their access.
 * Only admins can use this endpoint.
 * 
 * Body: { authUserId: string }
 */

import { createClient } from '@supabase/supabase-js'

const LOCKED_PASSWORD = 'GDDGDD2026'

export default defineEventHandler(async (event) => {
  // Get request body
  const body = await readBody(event)
  const { authUserId } = body

  if (!authUserId) {
    throw createError({
      statusCode: 400,
      message: 'Missing authUserId'
    })
  }

  // Verify admin access via session cookie
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Create Supabase client with service role for admin operations
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Admin Disable Login] Missing credentials:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || process.env.NUXT_PUBLIC_SUPABASE_KEY || '')
  
  // Verify the caller's token and check if they're an admin
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  
  if (authError || !callerUser) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Check if caller is admin
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || !['super_admin', 'admin'].includes(callerProfile?.role)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required'
    })
  }

  // Don't allow disabling your own login
  if (authUserId === callerUser.id) {
    throw createError({
      statusCode: 400,
      message: 'Cannot disable your own login'
    })
  }

  // Change the user's password to the locked password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    { password: LOCKED_PASSWORD }
  )

  if (updateError) {
    console.error('Error disabling login:', updateError)
    throw createError({
      statusCode: 500,
      message: `Failed to disable login: ${updateError.message}`
    })
  }

  // Log this action for audit purposes
  console.log(`[AUDIT] Login disabled for user ${authUserId} by admin ${callerUser.id} at ${new Date().toISOString()}`)

  return {
    success: true,
    message: 'Login disabled successfully'
  }
})
