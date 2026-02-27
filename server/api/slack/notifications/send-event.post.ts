/**
 * Send Event Notification - Helper Endpoint
 * ==========================================
 * Send a notification for a specific event type with template resolution
 * 
 * POST /api/slack/notifications/send-event
 * Body: {
 *   eventType: string, // e.g., 'employee_onboarding', 'visitor_arrival'
 *   data: object, // Data to fill in template placeholders
 *   overrideChannel?: string, // Override default channel
 *   overrideMessage?: string // Override template message
 * }
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)
  const body = await readBody(event)

  const { eventType, data, overrideChannel, overrideMessage } = body

  if (!eventType) {
    return { ok: false, error: 'Event type is required' }
  }

  try {
    // Get the trigger configuration
    const { data: trigger, error: triggerError } = await client
      .from('notification_triggers')
      .select('*')
      .eq('event_type', eventType)
      .single()

    if (triggerError || !trigger) {
      return { ok: false, error: `Trigger not found for event type: ${eventType}` }
    }

    if (!trigger.is_active) {
      return { ok: false, error: 'Notification trigger is disabled' }
    }

    // Resolve message template
    let message = overrideMessage || trigger.message_template || ''
    
    // Replace placeholders like {{employee_name}} with actual values
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`
        message = message.replace(new RegExp(placeholder, 'g'), String(value || ''))
      }
    }

    const channel = overrideChannel || trigger.channel_target
    let slackUserId = null

    // If DM enabled and we have a target user
    if (trigger.send_dm && data?.slack_user_id) {
      slackUserId = data.slack_user_id
    }

    // Queue the notification
    const { data: notification, error: queueError } = await client
      .from('notification_queue')
      .insert({
        trigger_id: trigger.id,
        channel: channel,
        slack_user_id: slackUserId,
        message,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        metadata: { eventType, originalData: data }
      })
      .select()
      .single()

    if (queueError) {
      return { ok: false, error: `Failed to queue notification: ${queueError.message}` }
    }

    // If channel notification, also add a DM if configured
    if (trigger.send_dm && slackUserId && channel) {
      await client
        .from('notification_queue')
        .insert({
          trigger_id: trigger.id,
          channel: null,
          slack_user_id: slackUserId,
          message,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
          metadata: { eventType, originalData: data, isDM: true }
        })
    }

    return { ok: true, notificationId: notification.id }

  } catch (error: any) {
    logger.error('Error sending event notification', error, 'slack/notifications/send-event')
    return { ok: false, error: error.message }
  }
})
