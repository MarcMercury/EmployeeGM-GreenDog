/**
 * Slack Sync Service - Get Sync Status
 * =====================================
 * Returns current sync status, recent logs, and pending conflicts
 * 
 * GET /api/slack/sync/status
 */

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication + admin role
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

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

  try {
    // Get last sync log
    const { data: lastSync, error: syncError } = await client
      .from('slack_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Get recent sync logs (last 10)
    const { data: recentLogs } = await client
      .from('slack_sync_logs')
      .select('id, sync_type, status, started_at, completed_at, matched_count, errors_count, pending_review_count')
      .order('started_at', { ascending: false })
      .limit(10)

    // Get pending conflicts count
    const { count: pendingConflicts } = await client
      .from('slack_sync_conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get sync stats
    const { data: employees } = await client
      .from('employees')
      .select('slack_status')

    const stats = {
      total: employees?.length || 0,
      linked: employees?.filter(e => e.slack_status === 'linked').length || 0,
      unlinked: employees?.filter(e => e.slack_status === 'unlinked').length || 0,
      deactivated: employees?.filter(e => e.slack_status === 'deactivated').length || 0,
      pending_review: employees?.filter(e => e.slack_status === 'pending_review').length || 0
    }

    return {
      ok: true,
      lastSync: lastSync || null,
      recentLogs: recentLogs || [],
      pendingConflicts: pendingConflicts || 0,
      stats
    }

  } catch (error: any) {
    logger.error('Error fetching sync status', error, 'slack/sync/status')
    return { ok: false, error: error.message }
  }
})
