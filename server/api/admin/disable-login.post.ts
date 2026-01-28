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
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

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

  // Get the profile to find the associated employee
  const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('auth_user_id', authUserId)
    .single()

  if (targetProfileError) {
    console.error('Error fetching target profile:', targetProfileError)
  }

  // Find the employee record linked to this profile
  let employeeId: string | null = null
  let employeeName = ''
  let managerAuthUserId: string | null = null

  if (targetProfile) {
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        manager_employee_id,
        manager:employees!employees_manager_employee_id_fkey(
          profile:profiles!employees_profile_id_fkey(
            auth_user_id
          )
        )
      `)
      .eq('profile_id', targetProfile.id)
      .single()

    if (employee) {
      employeeId = employee.id
      employeeName = `${employee.first_name} ${employee.last_name}`
      const manager = employee.manager as any
      managerAuthUserId = manager?.profile?.auth_user_id || null
    } else {
      employeeName = `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim() || targetProfile.email
    }
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

  // Update the profile's is_active flag
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('auth_user_id', authUserId)

  if (profileUpdateError) {
    console.error('Error updating profile is_active:', profileUpdateError)
  }

  // Also set employee status to terminated if employee record exists
  if (employeeId) {
    const { error: empUpdateError } = await supabaseAdmin
      .from('employees')
      .update({
        employment_status: 'terminated',
        termination_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)

    if (empUpdateError) {
      console.error('Error updating employee status:', empUpdateError)
    }
  }

  // Get all HR, Admin, and Manager users to notify
  const notifyUserIds: string[] = []
  
  // Add manager if exists
  if (managerAuthUserId && managerAuthUserId !== callerUser.id) {
    notifyUserIds.push(managerAuthUserId)
  }

  // Get all admin/HR/manager users
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('auth_user_id')
    .in('role', ['super_admin', 'admin', 'hr_admin', 'manager'])
    .eq('is_active', true)
    .not('auth_user_id', 'is', null)

  if (adminUsers) {
    for (const user of adminUsers) {
      if (user.auth_user_id && 
          !notifyUserIds.includes(user.auth_user_id) && 
          user.auth_user_id !== callerUser.id &&
          user.auth_user_id !== authUserId) {
        notifyUserIds.push(user.auth_user_id)
      }
    }
  }

  // Create in-app notifications
  if (notifyUserIds.length > 0) {
    const notifications = notifyUserIds.map(userId => ({
      user_id: userId,
      title: 'Login Disabled',
      message: `Login has been disabled for ${employeeName}`,
      type: 'employee_deactivation',
      reference_type: employeeId ? 'employee' : 'profile',
      reference_id: employeeId || targetProfile?.id,
      created_at: new Date().toISOString(),
      read: false
    }))

    await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .catch(err => console.error('Error creating notifications:', err))
  }

  // Try Slack notification
  try {
    await $fetch('/api/slack/send', {
      method: 'POST',
      body: {
        type: 'channel',
        channel: '#hr-notifications',
        text: `🔒 *Login Disabled*\n*Employee:* ${employeeName}\n*Disabled by:* Admin\n*Date:* ${new Date().toLocaleDateString()}`
      }
    }).catch(() => {})
  } catch (e) {
    // Slack optional
  }

  // Log this action for audit purposes
  console.log(`[AUDIT] Login disabled for user ${authUserId} (${employeeName}) by admin ${callerUser.id} at ${new Date().toISOString()}`)

  return {
    success: true,
    message: 'Login disabled successfully'
  }
})
