/**
 * Slack Sync Service - Resolve Conflict
 * ======================================
 * Manually resolve a sync conflict by linking, ignoring, or other action
 * 
 * POST /api/slack/sync/resolve
 * Body: { 
 *   conflictId: string,
 *   action: 'link' | 'ignore' | 'manual_link',
 *   slackUserId?: string, // Required for 'manual_link'
 *   notes?: string
 * }
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  const body = await readBody(event)

  if (!user) {
    return { ok: false, error: 'Unauthorized' }
  }

  const { conflictId, action, slackUserId, notes } = body

  if (!conflictId || !action) {
    return { ok: false, error: 'Missing required fields: conflictId, action' }
  }

  try {
    // Get the conflict
    const { data: conflict, error: fetchError } = await client
      .from('slack_sync_conflicts')
      .select('*')
      .eq('id', conflictId)
      .single()

    if (fetchError || !conflict) {
      return { ok: false, error: 'Conflict not found' }
    }

    const now = new Date().toISOString()

    if (action === 'link' || action === 'manual_link') {
      // Link the employee to the Slack user
      const slackId = action === 'manual_link' ? slackUserId : conflict.slack_user_id

      if (!slackId) {
        return { ok: false, error: 'No Slack user ID provided for linking' }
      }

      // Update employee
      if (conflict.employee_id) {
        const { error: updateError } = await client
          .from('employees')
          .update({
            slack_user_id: slackId,
            slack_status: 'linked',
            last_slack_sync: now
          })
          .eq('id', conflict.employee_id)

        if (updateError) {
          return { ok: false, error: `Failed to update employee: ${updateError.message}` }
        }
      }

      // Update profile if exists
      if (conflict.profile_id) {
        await client
          .from('profiles')
          .update({
            slack_user_id: slackId,
            slack_status: 'linked',
            last_slack_sync: now
          })
          .eq('id', conflict.profile_id)
      }
    }

    // Update conflict as resolved
    const { error: resolveError } = await client
      .from('slack_sync_conflicts')
      .update({
        status: action === 'ignore' ? 'ignored' : 'resolved',
        resolved_by: user.id,
        resolved_at: now,
        resolution_notes: notes || `${action} by admin`
      })
      .eq('id', conflictId)

    if (resolveError) {
      return { ok: false, error: `Failed to update conflict: ${resolveError.message}` }
    }

    return { ok: true, message: `Conflict ${action === 'ignore' ? 'ignored' : 'resolved'} successfully` }

  } catch (error: any) {
    console.error('Error resolving conflict:', error)
    return { ok: false, error: error.message }
  }
})
