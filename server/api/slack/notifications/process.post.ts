/**
 * Notification Queue - Process Queue
 * ===================================
 * Process pending notifications and send them to Slack
 * This should be called periodically (e.g., every minute)
 * 
 * POST /api/slack/notifications/process
 * Body: { limit?: number } // Max notifications to process (default 50)
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN
  const SUPABASE_URL = config.public.supabaseUrl || process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SLACK_BOT_TOKEN) {
    return { ok: false, error: 'Slack bot token not configured' }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Slack Notifications] Missing config. URL:', !!SUPABASE_URL, 'Key:', !!SUPABASE_SERVICE_ROLE_KEY)
    return { ok: false, error: 'Supabase configuration missing' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const limit = body?.limit || 50
  const now = new Date().toISOString()

  try {
    // Get pending notifications that are due
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (fetchError) {
      return { ok: false, error: `Failed to fetch queue: ${fetchError.message}` }
    }

    if (!notifications || notifications.length === 0) {
      return { ok: true, processed: 0, message: 'No pending notifications' }
    }

    let successCount = 0
    let failedCount = 0

    for (const notification of notifications) {
      try {
        let channelId = notification.channel

        // If it's a DM, open conversation first
        if (notification.slack_user_id && !channelId) {
          const openRes = await fetch('https://slack.com/api/conversations.open', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ users: notification.slack_user_id })
          })

          const openData: any = await openRes.json()
          
          if (!openData.ok) {
            throw new Error(`Failed to open DM: ${openData.error}`)
          }

          channelId = openData.channel.id
        }

        if (!channelId) {
          throw new Error('No channel specified')
        }

        // Send the message
        const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: channelId,
            text: notification.message,
            blocks: notification.blocks
          })
        })

        const msgData: any = await msgRes.json()

        if (!msgData.ok) {
          throw new Error(`Slack API error: ${msgData.error}`)
        }

        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        successCount++

      } catch (error: any) {
        console.error(`Failed to send notification ${notification.id}:`, error)
        
        const newRetryCount = (notification.retry_count || 0) + 1
        const shouldRetry = newRetryCount < (notification.max_retries || 3)

        await supabase
          .from('notification_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: newRetryCount,
            error_message: error.message
          })
          .eq('id', notification.id)

        failedCount++
      }
    }

    return {
      ok: true,
      processed: notifications.length,
      success: successCount,
      failed: failedCount
    }

  } catch (error: any) {
    console.error('Error processing notification queue:', error)
    return { ok: false, error: error.message }
  }
})
