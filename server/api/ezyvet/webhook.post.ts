/**
 * ezyVet Webhook Receiver
 *
 * POST /api/ezyvet/webhook
 *
 * Receives push notifications from ezyVet when appointments, consults,
 * or other resources change. Logs the event and optionally triggers
 * a targeted sync for the affected record.
 *
 * Security: Validates the webhook secret header.
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '../../utils/logger'
import { syncAppointments, syncConsults } from '../../utils/ezyvet/sync'
import type { EzyVetClinic } from '../../utils/ezyvet/types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = config.ezyvetWebhookSecret

  // ── Verify webhook secret ──
  const incomingSecret = getHeader(event, 'x-ezyvet-webhook-secret')
    || getHeader(event, 'x-webhook-secret')

  if (webhookSecret && incomingSecret !== webhookSecret) {
    logger.warn('ezyVet webhook: invalid secret', 'ezyvet-webhook')
    throw createError({ statusCode: 401, message: 'Invalid webhook secret' })
  }

  const supabase = await serverSupabaseServiceRole(event)
  let body: any

  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid request body' })
  }

  logger.info('ezyVet webhook received', 'ezyvet-webhook', {
    event: body?.event,
    itemCount: body?.items?.length,
  })

  // ── Determine the clinic by site_uid or fallback ──
  const siteUid = body?.meta?.site_uid
    || getHeader(event, 'x-ezyvet-site-uid')

  let clinic: EzyVetClinic | null = null
  if (siteUid) {
    const { data } = await supabase
      .from('ezyvet_clinics')
      .select('*')
      .eq('site_uid', siteUid)
      .eq('is_active', true)
      .single()
    clinic = data as EzyVetClinic | null
  }

  // ── Log every webhook event ──
  const eventType: string = body?.event || 'unknown'
  const items: Array<{ id: number; type: string; [k: string]: unknown }> = body?.items || []

  const eventsToInsert = items.length > 0
    ? items.map((item) => ({
        clinic_id: clinic?.id || null,
        event_type: eventType,
        resource_type: item.type || eventType.split('.')[0] || null,
        resource_id: item.id || null,
        payload: body,
      }))
    : [{
        clinic_id: clinic?.id || null,
        event_type: eventType,
        resource_type: eventType.split('.')[0] || null,
        resource_id: null,
        payload: body,
      }]

  const { error: insertErr } = await supabase
    .from('ezyvet_webhook_events')
    .insert(eventsToInsert)

  if (insertErr) {
    logger.error('Failed to log webhook event', insertErr, 'ezyvet-webhook')
  }

  // ── Auto-sync based on event type ──
  if (clinic) {
    try {
      const resourceType = eventType.split('.')[0]

      if (resourceType === 'appointment') {
        // Sync only recent appointments (last 24h) for speed
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        await syncAppointments(supabase, clinic, { since, triggeredBy: 'webhook' })
        logger.info('Webhook-triggered appointment sync complete', 'ezyvet-webhook')
      }

      if (resourceType === 'consult') {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        await syncConsults(supabase, clinic, { since, triggeredBy: 'webhook' })
        logger.info('Webhook-triggered consult sync complete', 'ezyvet-webhook')
      }

      // Mark events as processed
      const eventIds = eventsToInsert
        .filter((e) => e.clinic_id)
        .map((e) => e) // will use the inserted IDs - updateing by payload match
      if (insertErr === null) {
        // We'll mark by received_at window since we don't have the insert ids
        await supabase
          .from('ezyvet_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('clinic_id', clinic.id)
          .eq('event_type', eventType)
          .eq('processed', false)
          .gte('received_at', new Date(Date.now() - 5000).toISOString())
      }
    } catch (syncErr) {
      logger.error('Webhook auto-sync failed', syncErr instanceof Error ? syncErr : null, 'ezyvet-webhook')
      // Don't throw – we still want to return 200 to ezyVet
    }
  }

  return { ok: true, received: eventsToInsert.length }
})
