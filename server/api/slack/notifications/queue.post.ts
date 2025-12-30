/**
 * Notification Queue - Send Notification
 * =======================================
 * Queue a notification to be sent to Slack
 * 
 * POST /api/slack/notifications/queue
 * Body: {
 *   triggerType: string, // Event type that triggered this
 *   channel?: string,
 *   slackUserId?: string, // For DMs
 *   message: string,
 *   blocks?: any[],
 *   metadata?: object,
 *   scheduledFor?: string // ISO date for scheduled sending
 * }
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)

  const { triggerType, channel, slackUserId, message, blocks, metadata, scheduledFor } = body

  if (!message) {
    return { ok: false, error: 'Message is required' }
  }

  if (!channel && !slackUserId) {
    return { ok: false, error: 'Either channel or slackUserId is required' }
  }

  try {
    // Find the trigger configuration if it exists
    let triggerId = null
    if (triggerType) {
      const { data: trigger } = await client
        .from('notification_triggers')
        .select('id, is_active')
        .eq('event_type', triggerType)
        .single()

      if (trigger) {
        if (!trigger.is_active) {
          return { ok: false, error: 'Notification trigger is disabled' }
        }
        triggerId = trigger.id
      }
    }

    // Insert into queue
    const { data, error } = await client
      .from('notification_queue')
      .insert({
        trigger_id: triggerId,
        channel,
        slack_user_id: slackUserId,
        message,
        blocks,
        status: 'pending',
        scheduled_for: scheduledFor || new Date().toISOString(),
        metadata
      })
      .select()
      .single()

    if (error) {
      return { ok: false, error: `Failed to queue notification: ${error.message}` }
    }

    return { ok: true, notificationId: data.id }

  } catch (error: any) {
    console.error('Error queuing notification:', error)
    return { ok: false, error: error.message }
  }
})
