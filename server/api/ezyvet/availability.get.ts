/**
 * ezyVet Availability Check
 *
 * GET /api/ezyvet/availability?clinicId=xxx&date=2026-02-15
 *
 * Proxies the /ezycab/availability endpoint for real-time
 * slot checking. This endpoint has a higher rate limit (300/min).
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { logger } from '../../utils/logger'
import { ezyvetFetch } from '../../utils/ezyvet/client'
import type { EzyVetClinic } from '../../utils/ezyvet/types'

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
  const clinicId = query.clinicId as string
  const date = query.date as string

  if (!clinicId || !date) {
    throw createError({ statusCode: 400, message: 'clinicId and date are required' })
  }

  const { data: clinic } = await supabase
    .from('ezyvet_clinics')
    .select('*')
    .eq('id', clinicId)
    .eq('is_active', true)
    .single()

  if (!clinic) {
    throw createError({ statusCode: 404, message: 'Clinic not found' })
  }

  try {
    const result = await ezyvetFetch(
      supabase,
      clinic as EzyVetClinic,
      `/ezycab/availability?date=${date}`
    )

    return result
  } catch (err) {
    logger.error('Availability check failed', err instanceof Error ? err : null, 'ezyvet-availability')
    throw createError({
      statusCode: 502,
      message: `Availability check failed: ${(err as Error).message}`,
    })
  }
})
