/**
 * Slack Sync Service - Get Conflicts
 * ===================================
 * Returns list of sync conflicts requiring manual review
 * 
 * GET /api/slack/sync/conflicts
 * Query: { status?: 'pending' | 'resolved' | 'ignored' }
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const status = query.status as string || 'pending'

  try {
    let queryBuilder = client
      .from('slack_sync_conflicts')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email_work, employment_status),
        profile:profiles(id, first_name, last_name, email, role),
        resolver:profiles!slack_sync_conflicts_resolved_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status)
    }

    const { data, error } = await queryBuilder

    if (error) throw error

    return { ok: true, conflicts: data || [] }

  } catch (error: any) {
    console.error('Error fetching conflicts:', error)
    return { ok: false, error: error.message, conflicts: [] }
  }
})
