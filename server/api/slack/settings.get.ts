/**
 * Slack API - Get Settings
 * ========================
 * Returns configured Slack channel IDs for different notification types.
 * Requires authentication.
 */

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify admin role
  const adminClient = await serverSupabaseServiceRole(event)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as any)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  try {
    const supabase = await serverSupabaseClient(event)
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'slack_%')
    
    if (error) {
      logger.error('Failed to fetch Slack settings', error, 'slack/settings')
      return { ok: false, error: error.message, settings: {} }
    }
    
    // Convert to a simple object
    const settings: Record<string, string | null> = {}
    data?.forEach((row: { key: string; value: string | null }) => {
      const key = row.key.replace('slack_', '')
      settings[key] = row.value
    })
    
    return { ok: true, settings }
  } catch (error: any) {
    logger.error('Error fetching Slack settings', error, 'slack/settings')
    return { ok: false, error: error.message, settings: {} }
  }
})
