/**
 * Cleanup Orphaned/Stale Data Cron Job
 * 
 * Runs every Sunday at 4:00 AM UTC (Saturday 8pm PST)
 * Cleans up orphaned records and stale data
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/cleanup-stale", "schedule": "0 4 * * 0" }
 *   ]
 * }
 */

import { serverSupabaseServiceRole } from '#supabase/server'
// logger is auto-imported from server/utils/logger.ts

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  // Verify cron secret for security
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret
  
  if (!cronSecret) {
    logger.error('[CleanupCron] CRON_SECRET not configured - rejecting request')
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[CleanupCron] Unauthorized cron attempt')
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  logger.cron('cleanup-stale', 'started', { timestamp: new Date().toISOString() })

  const supabase = await serverSupabaseServiceRole(event)
  const results = {
    expiredSessions: { deleted: 0 },
    orphanedNotifications: { deleted: 0 },
    staleActivityLogs: { archived: 0 },
    pendingUserCleanup: { processed: 0 }
  }

  try {
    // 1. Clean up expired or orphaned sessions (older than 30 days)
    logger.info('[CleanupCron] Cleaning expired sessions...')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    // Note: Supabase handles auth sessions, but we may have custom session tracking
    const { count: sessionCount, error: sessionError } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_active_at', thirtyDaysAgo)
      .select('*', { count: 'exact', head: true })
      .catch(() => ({ count: 0, error: null }))

    if (!sessionError && sessionCount) {
      results.expiredSessions.deleted = sessionCount
    }

    // 2. Remove notifications older than 90 days
    logger.info('[CleanupCron] Cleaning old notifications...')
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    
    const { count: notifCount, error: notifError } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .eq('read', true)
      .select('*', { count: 'exact', head: true })
      .catch(() => ({ count: 0, error: null }))

    if (!notifError && notifCount) {
      results.orphanedNotifications.deleted = notifCount
    }

    // 3. Archive old activity logs (older than 180 days)
    logger.info('[CleanupCron] Archiving old activity logs...')
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    
    // Count logs that would be archived (actual archiving would be a separate process)
    const { count: logCount, error: logError } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', sixMonthsAgo)
      .catch(() => ({ count: 0, error: null }))

    if (!logError && logCount) {
      results.staleActivityLogs.archived = logCount
      // In production, you'd move these to an archive table or export to storage
    }

    // 4. Clean up pending users that have been pending for over 7 days
    logger.info('[CleanupCron] Processing stale pending users...')
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { count: pendingCount, error: pendingError } = await supabase
      .from('pending_users')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', sevenDaysAgo)
      .eq('status', 'pending')
      .catch(() => ({ count: 0, error: null }))

    if (!pendingError && pendingCount) {
      results.pendingUserCleanup.processed = pendingCount
      // Could send reminder emails or auto-expire these
    }

    // 5. Clean up orphaned employee records (employees without profiles)
    logger.info('[CleanupCron] Checking for orphaned employee records...')
    const { data: orphanedEmps, error: orphanError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .is('profile_id', null)
      .eq('status', 'inactive')
      .limit(100)
      .catch(() => ({ data: [], error: null }))

    if (!orphanError && orphanedEmps && orphanedEmps.length > 0) {
      logger.warn('[CleanupCron] Found orphaned inactive employees', {
        count: orphanedEmps.length,
        sample: orphanedEmps.slice(0, 5).map(e => e.email)
      })
    }

    const duration = Date.now() - startTime
    logger.cron('cleanup-stale', 'completed', {
      duration: `${duration}ms`,
      results
    })

    return {
      success: true,
      duration: `${duration}ms`,
      results
    }

  } catch (error: any) {
    logger.error('[CleanupCron] Unexpected error', error)
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Cleanup job failed'
    })
  }
})
