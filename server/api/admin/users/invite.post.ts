/**
 * POST /api/admin/users/invite
 * 
 * Sends an email invitation to an employee to create their account.
 * Uses Supabase's inviteUserByEmail to send a magic link.
 * Only admin roles can access this endpoint.
 * 
 * Body: {
 *   email: string
 *   firstName?: string
 *   lastName?: string
 *   employeeId: string
 *   profileId: string
 *   role?: string (default: 'employee')
 * }
 */

import { createClient } from '@supabase/supabase-js'

interface InviteUserRequest {
  email: string
  firstName?: string
  lastName?: string
  employeeId: string
  profileId: string
  role?: string
}

export default defineEventHandler(async (event) => {
  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Get request body
  const body = await readBody<InviteUserRequest>(event)
  
  if (!body.email || !body.employeeId || !body.profileId) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: email, employeeId, profileId'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format'
    })
  }

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Admin Invite User API] Missing credentials:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey
    })
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

  // Check if caller is admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || !callerProfile) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Profile not found'
    })
  }

  const adminRoles = ['admin', 'super_admin', 'hr_admin', 'management']
  if (!adminRoles.includes(callerProfile.role)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required'
    })
  }

  try {
    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === body.email.toLowerCase())
    
    if (existingAuthUser) {
      throw createError({
        statusCode: 400,
        message: `An account with email "${body.email}" already exists. Please use a different email.`
      })
    }

    // Check if profile already has an auth_user_id linked
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id')
      .eq('id', body.profileId)
      .single()

    if (existingProfile?.auth_user_id) {
      throw createError({
        statusCode: 400,
        message: 'This employee already has a user account linked.'
      })
    }

    // Get the redirect URL
    const appUrl = process.env.APP_URL || config.public.appUrl || 'https://employeegm.greendog.vet'
    const redirectTo = `${appUrl}/auth/callback?type=invite&profileId=${body.profileId}`

    // Send the invitation using Supabase's built-in invite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(body.email, {
      redirectTo,
      data: {
        first_name: body.firstName || '',
        last_name: body.lastName || '',
        profile_id: body.profileId,
        employee_id: body.employeeId,
        invited: true
      }
    })

    if (inviteError) {
      console.error('[Admin Invite User API] Invite error:', inviteError)
      throw createError({
        statusCode: 500,
        message: `Failed to send invitation: ${inviteError.message}`
      })
    }

    // Update employee record to mark that user account is needed
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        needs_user_account: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.employeeId)

    if (updateError) {
      console.warn('[Admin Invite User API] Could not update employee record:', updateError)
    }

    // Link the new auth user to the profile
    const { error: linkError } = await supabaseAdmin
      .from('profiles')
      .update({
        auth_user_id: inviteData.user.id,
        role: body.role || 'employee',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.profileId)

    if (linkError) {
      console.warn('[Admin Invite User API] Could not link auth user to profile:', linkError)
    }

    // Add system note
    await supabaseAdmin.from('employee_notes').insert({
      employee_id: body.employeeId,
      note: `Account invitation email sent to ${body.email}`,
      note_type: 'system',
      hr_only: false
    })

    console.log(`[Admin Invite User API] Invitation sent successfully to ${body.email}`)

    return {
      success: true,
      message: `Invitation sent to ${body.email}`,
      user: {
        id: inviteData.user.id,
        email: inviteData.user.email
      }
    }

  } catch (error: any) {
    // Re-throw HTTP errors as-is
    if (error.statusCode) {
      throw error
    }
    
    console.error('[Admin Invite User API] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to send invitation'
    })
  }
})
