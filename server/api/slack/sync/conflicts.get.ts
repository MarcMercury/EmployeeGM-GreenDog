/**
 * Slack Sync Service - Get Conflicts
 * ===================================
 * Returns list of sync conflicts requiring manual review
 * 
 * GET /api/slack/sync/conflicts
 * Query: { status?: 'pending' | 'resolved' | 'ignored' }
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
    logger.error('Error fetching conflicts', error, 'slack/sync/conflicts')
    return { ok: false, error: error.message, conflicts: [] }
  }
})
