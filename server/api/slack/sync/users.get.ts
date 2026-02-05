/**
 * Slack Sync Service - Get All Slack Users
 * ==========================================
 * Returns all Slack users for admin selection/matching
 * Requires authentication (admin action).
 * 
 * GET /api/slack/sync/users
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
    return { ok: false, error: 'Slack bot token not configured', users: [] }
  }

  try {
    const users: any[] = []
    let cursor: string | undefined = undefined

    do {
      const url = new URL('https://slack.com/api/users.list')
      if (cursor) url.searchParams.set('cursor', cursor)
      url.searchParams.set('limit', '200')

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }
      })

      const data: any = await response.json()

      if (!data.ok) {
        return { ok: false, error: `Slack API error: ${data.error}`, users: [] }
      }

      // Filter out bots and add relevant info
      for (const member of data.members) {
        if (member.is_bot || member.id === 'USLACKBOT') continue
        
        users.push({
          id: member.id,
          name: member.name,
          real_name: member.real_name || member.profile?.real_name || '',
          display_name: member.profile?.display_name || '',
          email: member.profile?.email || '',
          is_active: !member.deleted,
          avatar: member.profile?.image_72 || ''
        })
      }

      cursor = data.response_metadata?.next_cursor || undefined
    } while (cursor)

    // Sort by real_name
    users.sort((a, b) => a.real_name.localeCompare(b.real_name))

    return { ok: true, users }

  } catch (error: any) {
    console.error('Error fetching Slack users:', error)
    return { ok: false, error: error.message, users: [] }
  }
})
