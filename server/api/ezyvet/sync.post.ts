/**
 * ezyVet Manual Sync Trigger
 *
 * POST /api/ezyvet/sync
 *
 * Body: { clinicId: string, type: 'users' | 'appointments' | 'consults' | 'full', since?: string }
 *
 * Admin-only. Triggers a manual sync for a specific clinic.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { logger } from '../../utils/logger'
import { syncUsers, syncAppointments, syncConsults, syncAll } from '../../utils/ezyvet/sync'
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

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { clinicId, type = 'full', since } = body || {}

  if (!clinicId) {
    throw createError({ statusCode: 400, message: 'clinicId is required' })
  }

  // Fetch clinic with credentials
  const { data: clinic, error: clinicErr } = await supabase
    .from('ezyvet_clinics')
    .select('*')
    .eq('id', clinicId)
    .eq('is_active', true)
    .single()

  if (clinicErr || !clinic) {
    throw createError({ statusCode: 404, message: 'Clinic not found or inactive' })
  }

  const ezyClinic = clinic as EzyVetClinic
  const triggeredBy = user.id

  logger.info(`Manual sync triggered: ${type} for ${ezyClinic.label}`, 'ezyvet-sync', {
    clinicId,
    type,
    since,
  })

  try {
    let result: any

    switch (type) {
      case 'users':
        result = await syncUsers(supabase, ezyClinic, triggeredBy)
        break
      case 'appointments':
        result = await syncAppointments(supabase, ezyClinic, { since, triggeredBy })
        break
      case 'consults':
        result = await syncConsults(supabase, ezyClinic, { since, triggeredBy })
        break
      case 'full':
      default:
        result = await syncAll(supabase, ezyClinic, { since, triggeredBy })
        break
    }

    return { ok: true, type, clinic: ezyClinic.label, result }
  } catch (err) {
    logger.error('Manual sync failed', err instanceof Error ? err : null, 'ezyvet-sync')
    throw createError({
      statusCode: 500,
      message: `Sync failed: ${(err as Error).message}`,
    })
  }
})
