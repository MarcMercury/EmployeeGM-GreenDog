/**
 * Slack API - Get Settings
 * ========================
 * Returns configured Slack channel IDs for different notification types.
 * Requires authentication.
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    const supabase = await serverSupabaseClient(event)
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'slack_%')
    
    if (error) {
      console.error('Failed to fetch Slack settings:', error)
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
    console.error('Error fetching Slack settings:', error)
    return { ok: false, error: error.message, settings: {} }
  }
})
