/**
 * Slack Scheduled Sync - Cron Handler
 * ====================================
 * This endpoint should be called periodically (e.g., every 6 hours)
 * by an external scheduler (cron job, GitHub Actions, etc.)
 * 
 * GET /api/slack/sync/scheduled
 * 
 * Optional header: X-Cron-Secret for authentication
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  // Optional: Validate cron secret for security
  const cronSecret = getHeader(event, 'x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET
  
  if (expectedSecret && cronSecret !== expectedSecret) {
    return { ok: false, error: 'Unauthorized' }
  }

  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN

  if (!SLACK_BOT_TOKEN) {
    console.error('[Slack Scheduled] Missing Slack bot token')
    return { ok: false, error: 'Missing Slack configuration' }
  }

  // Use Nuxt Supabase module's service role client
  const supabase = await serverSupabaseServiceRole(event)

  try {
    // Check when last sync was run
    const { data: lastSync } = await supabase
      .from('slack_sync_logs')
      .select('completed_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Skip if last sync was less than 4 hours ago (prevents over-syncing)
    if (lastSync?.completed_at) {
      const lastSyncTime = new Date(lastSync.completed_at).getTime()
      const hoursSinceLastSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60)
      
      if (hoursSinceLastSync < 4) {
        return { 
          ok: true, 
          skipped: true, 
          message: `Skipped - last sync was ${hoursSinceLastSync.toFixed(1)} hours ago` 
        }
      }
    }

    // Call the main sync endpoint internally
    const syncResponse = await $fetch('/api/slack/sync/run', {
      method: 'POST',
      body: { triggered_by: 'scheduled_cron' }
    })

    // Also process any pending notifications
    const notificationResponse = await $fetch('/api/slack/notifications/process', {
      method: 'POST',
      body: { limit: 100 }
    })

    // Check for conflicts and send admin alerts if needed
    const { count: pendingConflicts } = await supabase
      .from('slack_sync_conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingConflicts && pendingConflicts > 0) {
      // Queue admin notification about pending conflicts
      const adminChannel = await getAdminNotificationChannel(supabase)
      if (adminChannel) {
        await supabase
          .from('notification_queue')
          .insert({
            channel: adminChannel,
            message: `⚠️ *Slack Sync Alert*\n\nThere are ${pendingConflicts} pending conflicts requiring review.\n\nVisit Admin > Slack Integration > User Sync to resolve.`,
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            metadata: { type: 'admin_alert', pending_conflicts: pendingConflicts }
          })
      }
    }

    return {
      ok: true,
      sync: syncResponse,
      notifications: notificationResponse,
      pendingConflicts
    }

  } catch (error: any) {
    console.error('Scheduled sync failed:', error)
    return { ok: false, error: error.message }
  }
})

async function getAdminNotificationChannel(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'slack_general_notifications_channel')
    .single()
  
  return data?.value || null
}
