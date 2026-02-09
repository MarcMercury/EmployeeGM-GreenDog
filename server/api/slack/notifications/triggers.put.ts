/**
 * Notification Triggers - Update Trigger
 * =======================================
 * Update a notification trigger configuration
 * 
 * PUT /api/slack/notifications/triggers
 * Body: {
 *   id: string,
 *   is_active?: boolean,
 *   channel_target?: string,
 *   send_dm?: boolean,
 *   message_template?: string
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

  const { id, ...updates } = body

  if (!id) {
    return { ok: false, error: 'Trigger ID is required' }
  }

  try {
    const { data, error } = await client
      .from('notification_triggers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, trigger: data }

  } catch (error: any) {
    logger.error('Error updating trigger', error, 'slack/notifications/triggers')
    return { ok: false, error: error.message }
  }
})
