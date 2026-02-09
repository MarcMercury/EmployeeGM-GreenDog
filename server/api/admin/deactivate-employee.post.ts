/**
 * POST /api/admin/deactivate-employee
 * 
 * Comprehensive employee deactivation workflow:
 * 1. Sets profile is_active = false
 * 2. Sets employee employment_status = 'terminated'
 * 3. Changes password to locked value (disables login)
 * 4. Notifies the employee's manager
 * 5. Notifies all HR, Admin, and Manager role users
 * 
 * Body: { 
 *   employeeId: string,
 *   reason?: string,
 *   terminationDate?: string,
 *   skipPasswordLock?: boolean  // If already handling password separately
 * }
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

interface DeactivationRequest {
  employeeId: string
  reason?: string
  terminationDate?: string
  skipPasswordLock?: boolean
}

export default defineEventHandler(async (event) => {
  // Get request body
  const body = await readBody<DeactivationRequest>(event)
  const { employeeId, reason, terminationDate, skipPasswordLock } = body

  if (!employeeId) {
    throw createError({
      statusCode: 400,
      message: 'Missing employeeId'
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
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Missing credentials', null, 'admin-deactivate-employee')
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

  // Check if caller has admin or HR access
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, id')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || !hasRole(callerProfile?.role, DEACTIVATE_ROLES)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin, HR, or Manager access required'
    })
  }

  // Get the employee's full info including manager and profile
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email_work,
      employment_status,
      manager_employee_id,
      profile_id,
      manager:employees!employees_manager_employee_id_fkey(
        id,
        first_name,
        last_name,
        email_work,
        profile:profiles!employees_profile_id_fkey(
          id,
          email,
          auth_user_id
        )
      ),
      profile:profiles!employees_profile_id_fkey(
        id,
        email,
        auth_user_id,
        is_active
      )
    `)
    .eq('id', employeeId)
    .single()

  if (empError || !employee) {
    logger.error('Error fetching employee', empError, 'admin-deactivate-employee')
    throw createError({
      statusCode: 404,
      message: 'Employee not found'
    })
  }

  // Extract profile data (handle array or single object from Supabase)
  const profileData = Array.isArray(employee.profile) ? employee.profile[0] : employee.profile
  
  const employeeName = `${employee.first_name} ${employee.last_name}`
  const wasAlreadyTerminated = employee.employment_status === 'terminated'
  const wasAlreadyDeactivated = profileData?.is_active === false

  // 1. Update employee status to terminated
  const { error: empUpdateError } = await supabaseAdmin
    .from('employees')
    .update({
      employment_status: 'terminated',
      termination_date: terminationDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', employeeId)

  if (empUpdateError) {
    logger.error('Error updating employee status', empUpdateError, 'admin-deactivate-employee')
    throw createError({
      statusCode: 500,
      message: `Failed to update employee status: ${empUpdateError.message}`
    })
  }

  // 2. Update profile is_active to false (if profile exists)
  if (profileData?.id) {
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileData.id)

    if (profileUpdateError) {
      logger.error('Error updating profile', profileUpdateError, 'admin-deactivate-employee')
      // Don't fail - continue with the rest
    }
  }

  // 3. Lock the password (disable login)
  if (!skipPasswordLock && profileData?.auth_user_id) {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      profileData.auth_user_id,
      {
        password: randomUUID() + randomUUID(),
        ban_duration: '876000h' // ~100 years
      }
    )

    if (authUpdateError) {
      logger.error('Error locking password', authUpdateError, 'admin-deactivate-employee')
      // Don't fail - the profile is already deactivated
    }
  }

  // 4. Get list of people to notify
  const notifyUserIds: string[] = []
  const notificationMessages: Array<{userId: string, name: string, role: string}> = []

  // 4a. Get the manager's profile auth_user_id
  const managerData = Array.isArray(employee.manager) ? employee.manager[0] : employee.manager
  const managerProfileData = managerData?.profile ? (Array.isArray(managerData.profile) ? managerData.profile[0] : managerData.profile) : null
  if (managerProfileData?.auth_user_id) {
    notifyUserIds.push(managerProfileData.auth_user_id)
    notificationMessages.push({
      userId: managerProfileData.auth_user_id,
      name: `${managerData.first_name} ${managerData.last_name}`,
      role: 'Manager'
    })
  }

  // 4b. Get all HR, Admin, and Manager role users
  const { data: adminUsers, error: adminUsersError } = await supabaseAdmin
    .from('profiles')
    .select('auth_user_id, first_name, last_name, role, email')
    .in('role', ['super_admin', 'admin', 'hr_admin', 'manager'])
    .eq('is_active', true)
    .not('auth_user_id', 'is', null)

  if (!adminUsersError && adminUsers) {
    for (const user of adminUsers) {
      // Skip if already in list or is the caller
      if (!notifyUserIds.includes(user.auth_user_id!) && user.auth_user_id !== callerUser.id) {
        notifyUserIds.push(user.auth_user_id!)
        notificationMessages.push({
          userId: user.auth_user_id!,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          role: user.role
        })
      }
    }
  }

  // 5. Create in-app notifications
  const notificationData = {
    title: 'Employee Deactivated',
    message: `${employeeName} has been deactivated${reason ? `: ${reason}` : '.'}`,
    type: 'employee_deactivation',
    reference_type: 'employee',
    reference_id: employeeId,
    metadata: {
      employee_name: employeeName,
      reason: reason || 'No reason provided',
      termination_date: terminationDate || new Date().toISOString().split('T')[0],
      deactivated_by: callerUser.id
    }
  }

  // Check if notifications table exists and insert
  const { data: notificationsTable } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .limit(1)

  if (notificationsTable !== null) {
    // Table exists, insert notifications for each user
    const notifications = notifyUserIds.map(userId => ({
      ...notificationData,
      user_id: userId,
      created_at: new Date().toISOString(),
      read: false
    }))

    if (notifications.length > 0) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        logger.error('Error creating notifications', notifError, 'admin-deactivate-employee')
        // Don't fail - notifications are secondary
      }
    }
  }

  // 6. Try to send Slack notifications (if configured)
  try {
    // Build Slack message
    const slackMessage = {
      text: `🚨 *Employee Deactivated*\n*Name:* ${employeeName}\n*Date:* ${terminationDate || new Date().toISOString().split('T')[0]}\n*Reason:* ${reason || 'Not specified'}`,
      channel: '#hr-notifications' // Default HR channel
    }

    // Try to post to Slack via internal API
    await $fetch('/api/slack/send', {
      method: 'POST',
      body: {
        type: 'channel',
        channel: slackMessage.channel,
        text: slackMessage.text
      }
    }).catch(() => {
      // Slack not configured or failed - that's okay
      logger.warn('Slack notification skipped or failed', 'admin-deactivate-employee')
    })
  } catch (slackError) {
    // Slack notifications are optional
    logger.warn('Slack notification error', 'admin-deactivate-employee', { error: slackError })
  }

  // Log this action for audit purposes
  logger.info('Employee deactivated', 'AUDIT', { employeeId, employeeName, by: callerUser.id, reason: reason || 'Not specified' })

  await createAuditLog({
    action: 'employee_deactivated',
    entityType: 'employee',
    entityId: employeeId,
    actorProfileId: callerProfile.id,
    metadata: { employeeName, reason: reason || 'Not specified' }
  })

  return {
    success: true,
    message: `${employeeName} has been deactivated`,
    details: {
      employeeId,
      employeeName,
      wasAlreadyTerminated,
      wasAlreadyDeactivated,
      notificationsSent: notifyUserIds.length,
      terminationDate: terminationDate || new Date().toISOString().split('T')[0]
    }
  }
})
