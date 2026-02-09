/**
 * Slack API - Send Message
 * ========================
 * Server endpoint to send messages to Slack channels or DMs.
 * Uses the Bot Token stored in environment variables.
 * Requires authentication.
 */

import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify caller has management/admin role
  const client = await serverSupabaseClient(event)
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  
  if (!profile || !hasRole(profile.role, SLACK_ADMIN_ROLES)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const SLACK_BOT_TOKEN = config.slackBotToken
  
  if (!SLACK_BOT_TOKEN) {
    return { ok: false, error: 'Slack bot token not configured' }
  }

  try {
    if (body.type === 'dm') {
      // Open a DM conversation first
      const openRes = await $fetch<{ ok: boolean; channel?: { id: string }; error?: string }>(
        'https://slack.com/api/conversations.open',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: { users: body.userId }
        }
      )

      if (!openRes.ok) {
        return { ok: false, error: openRes.error || 'Failed to open DM' }
      }

      // Send message to DM channel
      const msgRes = await $fetch<{ ok: boolean; error?: string }>(
        'https://slack.com/api/chat.postMessage',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: {
            channel: openRes.channel?.id,
            text: body.text,
            blocks: body.blocks
          }
        }
      )

      return msgRes
    } else {
      // Send to channel
      const response = await $fetch<{ ok: boolean; error?: string }>(
        'https://slack.com/api/chat.postMessage',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: {
            channel: body.channel,
            text: body.text,
            blocks: body.blocks
          }
        }
      )

      return response
    }
  } catch (error: any) {
    logger.error('Slack API error', error, 'slack/send')
    return { ok: false, error: error.message }
  }
})
