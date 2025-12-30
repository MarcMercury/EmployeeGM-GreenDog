/**
 * Notification Triggers - Get All Triggers
 * =========================================
 * Returns all notification trigger configurations
 * 
 * GET /api/slack/notifications/triggers
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
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
    console.error('Error fetching triggers:', error)
    return { ok: false, error: error.message, triggers: [] }
  }
})
