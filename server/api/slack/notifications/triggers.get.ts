/**
 * Notification Triggers - Get All Triggers
 * =========================================
 * Returns all notification trigger configurations
 * 
 * GET /api/slack/notifications/triggers
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)

  try {
    const { data, error } = await client
      .from('notification_triggers')
      .select('*')
      .order('event_type', { ascending: true })

    if (error) {
      return { ok: false, error: error.message, triggers: [] }
    }

    return { ok: true, triggers: data || [] }

  } catch (error: any) {
    logger.error('Error fetching triggers', error, 'slack/notifications/triggers')
    return { ok: false, error: error.message, triggers: [] }
  }
})
