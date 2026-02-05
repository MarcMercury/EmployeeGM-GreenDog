/**
 * Slack API - Find User by Email
 * ===============================
 * Server endpoint to look up a Slack user by their email address.
 * Used to match EmployeeGM users to their Slack accounts.
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
  const body = await readBody(event)
  
  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN
  
  if (!SLACK_BOT_TOKEN) {
    return { ok: false, error: 'Slack bot token not configured' }
  }

  if (!body.email) {
    return { ok: false, error: 'Email is required' }
  }

  try {
    const response = await $fetch<{
      ok: boolean
      user?: {
        id: string
        name: string
        real_name: string
        profile: {
          email: string
          display_name: string
          real_name: string
        }
      }
      error?: string
    }>(
      'https://slack.com/api/users.lookupByEmail',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ email: body.email })
      }
    )

    if (!response.ok) {
      return { ok: false, error: response.error || 'User not found' }
    }

    return {
      ok: true,
      user: {
        id: response.user?.id,
        email: response.user?.profile?.email,
        real_name: response.user?.real_name || response.user?.profile?.real_name,
        display_name: response.user?.profile?.display_name || response.user?.name
      }
    }
  } catch (error: any) {
    console.error('Slack lookup error:', error)
    return { ok: false, error: error.message }
  }
})
