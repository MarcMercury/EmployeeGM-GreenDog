/**
 * ezyVet Sync Log
 *
 * GET /api/ezyvet/sync-log?clinicId=xxx&limit=20
 *
 * Admin-only. Returns recent sync history for a clinic.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const clinicId = query.clinicId as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)

  let q = supabase
    .from('ezyvet_api_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (clinicId) {
    q = q.eq('clinic_id', clinicId)
  }

  const { data, error } = await q

  if (error) {
    logger.error('Failed to fetch sync log', error, 'ezyvet-sync-log')
    throw createError({ statusCode: 500, message: 'Database error' })
  }

  return { logs: data || [] }
})
