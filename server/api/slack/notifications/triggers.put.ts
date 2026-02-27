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

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Verify admin role
  const adminClient = await serverSupabaseServiceRole(event)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as any)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const client = await serverSupabaseClient(event)
  const body = await readBody(event)
  const { id, ...rawUpdates } = body

  if (!id) {
    return { ok: false, error: 'Trigger ID is required' }
  }

  // Whitelist allowed update fields
  const allowedFields = ['is_active', 'channel_target', 'send_dm', 'message_template']
  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in rawUpdates) updates[key] = rawUpdates[key]
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
