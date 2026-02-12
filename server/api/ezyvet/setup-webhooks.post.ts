/**
 * ezyVet Setup – Register Webhooks
 *
 * POST /api/ezyvet/setup-webhooks
 *
 * Body: { clinicId: string, events?: string[] }
 *
 * Registers webhooks with ezyVet so they push updates to our
 * /api/ezyvet/webhook endpoint. Admin-only, one-time setup per clinic.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { logger } from '../../utils/logger'
import { ezyvetFetch } from '../../utils/ezyvet/client'
import type { EzyVetClinic } from '../../utils/ezyvet/types'

const DEFAULT_EVENTS = [
  'appointment.created',
  'appointment.updated',
  'appointment.deleted',
  'consult.created',
  'consult.updated',
  'animal.created',
  'animal.updated',
]

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
  const { clinicId, events = DEFAULT_EVENTS } = body || {}

  if (!clinicId) {
    throw createError({ statusCode: 400, message: 'clinicId is required' })
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

  const ezyClinic = clinic as EzyVetClinic
  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://your-domain.vercel.app'
  const webhookUrl = `${appUrl}/api/ezyvet/webhook`

  const results: Array<{ event: string; status: string; error?: string }> = []

  for (const eventName of events) {
    try {
      await ezyvetFetch(
        supabase,
        ezyClinic,
        '/v1/webhooks',
        {
          method: 'POST',
          body: JSON.stringify({
            webhook: {
              event: eventName,
              url: webhookUrl,
            },
          }),
        }
      )
      results.push({ event: eventName, status: 'registered' })
    } catch (err) {
      logger.error(`Failed to register webhook: ${eventName}`, err instanceof Error ? err : null, 'ezyvet-setup')
      results.push({ event: eventName, status: 'failed', error: (err as Error).message })
    }
  }

  logger.info('Webhook setup complete', 'ezyvet-setup', {
    clinic: ezyClinic.label,
    registered: results.filter((r) => r.status === 'registered').length,
    failed: results.filter((r) => r.status === 'failed').length,
  })

  return { ok: true, webhookUrl, results }
})
