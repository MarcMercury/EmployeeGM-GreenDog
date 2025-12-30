/**
 * Slack Sync Service - Link User
 * ================================
 * Manually link an employee to a Slack user by email lookup or direct ID
 * 
 * POST /api/slack/sync/link-user
 * Body: { 
 *   employeeId: string,
 *   slackUserId?: string, // Direct link
 *   email?: string // Look up by email
 * }
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)

  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN

  const { employeeId, slackUserId, email } = body

  if (!employeeId) {
    return { ok: false, error: 'Employee ID is required' }
  }

  if (!slackUserId && !email) {
    return { ok: false, error: 'Either slackUserId or email is required' }
  }

  try {
    let finalSlackUserId = slackUserId
    let slackEmail = email

    // If email provided, look up Slack user
    if (!finalSlackUserId && email) {
      const response = await fetch('https://slack.com/api/users.lookupByEmail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ email })
      })

      const data: any = await response.json()

      if (!data.ok) {
        return { ok: false, error: `Slack user not found: ${data.error}` }
      }

      finalSlackUserId = data.user.id
      slackEmail = data.user.profile?.email || email
    }

    const now = new Date().toISOString()

    // Update employee
    const { error: updateError } = await client
      .from('employees')
      .update({
        slack_user_id: finalSlackUserId,
        slack_status: 'linked',
        last_slack_sync: now
      })
      .eq('id', employeeId)

    if (updateError) {
      return { ok: false, error: `Failed to update employee: ${updateError.message}` }
    }

    // Also update the profile if linked
    const { data: employee } = await client
      .from('employees')
      .select('profile_id')
      .eq('id', employeeId)
      .single()

    if (employee?.profile_id) {
      await client
        .from('profiles')
        .update({
          slack_user_id: finalSlackUserId,
          slack_status: 'linked',
          last_slack_sync: now
        })
        .eq('id', employee.profile_id)
    }

    // Clear any pending conflicts for this employee
    await client
      .from('slack_sync_conflicts')
      .update({
        status: 'resolved',
        resolved_at: now,
        resolution_notes: 'Manually linked by admin'
      })
      .eq('employee_id', employeeId)
      .eq('status', 'pending')

    return { 
      ok: true, 
      message: 'Employee linked to Slack successfully',
      slackUserId: finalSlackUserId
    }

  } catch (error: any) {
    console.error('Error linking user:', error)
    return { ok: false, error: error.message }
  }
})
