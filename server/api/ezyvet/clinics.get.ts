/**
 * ezyVet Clinics CRUD
 *
 * GET  /api/ezyvet/clinics — list active clinics
 * 
 * Admin-only. Returns clinic metadata (credentials are redacted).
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

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const { data: clinics, error } = await supabase
    .from('ezyvet_clinics')
    .select('id, label, site_uid, location_id, base_url, scope, is_active, created_at')
    .eq('is_active', true)
    .order('label')

  if (error) {
    logger.error('Failed to fetch ezyvet clinics', error, 'ezyvet-clinics')
    throw createError({ statusCode: 500, message: 'Database error' })
  }

  return { clinics: clinics || [] }
})
