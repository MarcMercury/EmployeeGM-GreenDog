/**
 * POST /api/admin/disable-login
 * 
 * Changes a user's password to a locked password, effectively disabling their access.
 * Only admins can use this endpoint.
 * 
 * Body: { authUserId: string }
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

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
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Missing credentials', null, 'admin-disable-login', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || '')
  
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
    .select('role, id')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || !hasRole(callerProfile?.role, ADMIN_ROLES)) {
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

  // Disable the user's login by setting a cryptographically random password
  // and banning the user via Supabase admin API
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    {
      password: randomUUID() + randomUUID(),
      ban_duration: '876000h' // ~100 years
    }
  )

  if (banError) {
    logger.error('Error disabling login', banError, 'admin-disable-login')
    throw createError({
      statusCode: 500,
      message: `Failed to disable login: ${banError.message}`
    })
  }

  // Log this action for audit purposes
  logger.info('Login disabled', 'AUDIT', { authUserId, by: callerUser.id })

  await createAuditLog({
    action: 'user_login_disabled',
    entityType: 'user',
    entityId: authUserId,
    actorProfileId: callerProfile.id,
    metadata: {}
  })

  return {
    success: true,
    message: 'Login disabled successfully'
  }
})
