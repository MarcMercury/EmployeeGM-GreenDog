/**
 * Slack Scheduled Sync - Cron Handler
 * ====================================
 * This endpoint should be called periodically (e.g., every 6 hours)
 * by an external scheduler (cron job, GitHub Actions, etc.)
 * 
 * GET /api/slack/sync/scheduled
 * 
 * Required header: X-Cron-Secret for authentication
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  // Validate cron secret for security (REQUIRED)
  // Support both auth patterns:
  //   - X-Cron-Secret header (GitHub Actions workflow)
  //   - Authorization: Bearer <secret> (Vercel Cron)
  const xCronSecret = getHeader(event, 'x-cron-secret')
  const authHeader = getHeader(event, 'authorization')
  const expectedSecret = config.cronSecret
  
  if (!expectedSecret) {
    logger.error('CRON_SECRET not configured', null, 'Slack Scheduled')
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }
  
  const isAuthorized = xCronSecret === expectedSecret || authHeader === `Bearer ${expectedSecret}`
  if (!isAuthorized) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const SLACK_BOT_TOKEN = config.slackBotToken

  if (!SLACK_BOT_TOKEN) {
    logger.error('Missing Slack bot token', null, 'Slack Scheduled')
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

    // Call the unified Vercel cron endpoint which uses service-role auth
    // (avoids the user auth requirement of /api/slack/sync/run)
    const syncResponse = await $fetch('/api/cron/slack-sync', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${expectedSecret}` }
    })

    // Notification processing is handled inside slack-sync cron
    const notificationResponse = { ok: true, message: 'Handled by slack-sync cron' }

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
    logger.error('Scheduled sync failed', error, 'Slack Scheduled')
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
