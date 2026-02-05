/**
 * Slack API - List Channels
 * =========================
 * Server endpoint to list available Slack channels for channel picker.
 * Requires authentication.
 */

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  
  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN
  
  if (!SLACK_BOT_TOKEN) {
    return { ok: false, error: 'Slack bot token not configured', channels: [] }
  }

  try {
    const response = await $fetch<{
      ok: boolean
      channels?: Array<{
        id: string
        name: string
        is_private: boolean
        is_member: boolean
        num_members: number
      }>
      error?: string
    }>(
      'https://slack.com/api/conversations.list',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        query: {
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 200
        }
      }
    )

    if (!response.ok) {
      return { ok: false, error: response.error || 'Failed to list channels', channels: [] }
    }

    // Format channels for easy use
    const channels = (response.channels || []).map(ch => ({
      id: ch.id,
      name: ch.name,
      displayName: `#${ch.name}`,
      isPrivate: ch.is_private,
      isMember: ch.is_member,
      memberCount: ch.num_members
    }))

    return { ok: true, channels }
  } catch (error: any) {
    console.error('Slack list channels error:', error)
    return { ok: false, error: error.message, channels: [] }
  }
})
