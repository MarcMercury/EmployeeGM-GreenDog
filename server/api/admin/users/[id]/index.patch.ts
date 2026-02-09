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
  
  logger.debug('Starting request', 'admin-users-patch', { userId })
  
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'Missing user ID'
    })
  }

  // Validate userId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid user ID format — expected UUID'
    })
  }

  // Parse and validate request body
  let body: Record<string, any>
  try {
    body = await readBody(event)
    logger.debug('Request body', 'admin-users-patch', { body })
  } catch (e) {
    logger.error('Failed to parse body', e, 'admin-users-patch')
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('No auth header', 'admin-users-patch')
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Missing credentials', null, 'admin-users-patch', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || '')
  
  // Verify the caller's token
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  
  if (authError || !callerUser) {
    logger.warn('Auth error', 'admin-users-patch', { error: authError?.message })
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
    logger.error('Profile fetch error', profileError, 'admin-users-patch')
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch caller profile'
    })
  }

  if (callerProfile?.role !== 'super_admin') {
    logger.warn('Access denied', 'admin-users-patch', { role: callerProfile?.role })
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
  let validRoles: string[] = [...ALL_VALID_ROLES]
  
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('role_definitions')
      .select('role_key')
    
    if (roleError) {
      logger.warn('Could not fetch roles from DB, using defaults', 'admin-users-patch', { error: roleError.message })
    } else if (roleData && roleData.length > 0) {
      validRoles = roleData.map(r => r.role_key)
      logger.debug('Loaded roles from database', 'admin-users-patch', { count: validRoles.length })
    }
  } catch (e: any) {
    logger.warn('Exception fetching roles, using defaults', 'admin-users-patch', { error: e.message })
  }
  
  // validRoles already has defaults, no need for else block
  
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Validate role if changing it
      if (field === 'role') {
        if (!validRoles.includes(body[field])) {
          logger.warn('Invalid role', 'admin-users-patch', { role: body[field], validRoles })
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

  logger.info('Updating profile', 'admin-users-patch', { userId, updateData })

  // Update the profile
  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    logger.error('Update error', updateError, 'admin-users-patch')
    throw createError({
      statusCode: 500,
      message: `Failed to update user: ${updateError.message}`
    })
  }

  // Log this action for audit purposes
  logger.info('User updated', 'AUDIT', { userId, by: callerUser.id, updateData })

  await createAuditLog({
    action: 'user_updated',
    entityType: 'user',
    entityId: userId,
    actorProfileId: callerProfile.id,
    metadata: { fields: Object.keys(updateData).filter(k => k !== 'updated_at') }
  })

  return {
    success: true,
    user: updatedProfile,
    message: 'User updated successfully'
  }
})
