/**
 * ezyVet Cron Sync
 *
 * GET /api/cron/ezyvet-sync
 *
 * Triggered by Vercel Cron (or manually) to run a full sync
 * for all active ezyVet clinics. Protected by CRON_SECRET header.
 *
 * Schedule: every 4 hours → "0 * /4 * * *" in vercel.json
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '../../utils/logger'
import { syncAll } from '../../utils/ezyvet/sync'
import { syncAllAnalytics } from '../../utils/ezyvet/sync-analytics'
import type { EzyVetClinic } from '../../utils/ezyvet/types'

export default defineEventHandler(async (event) => {
  // Verify cron secret
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization')

  if (!config.cronSecret || authHeader !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Invalid or missing cron secret' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Fetch all active clinics
  const { data: clinics, error: fetchErr } = await supabase
    .from('ezyvet_clinics')
    .select('*')
    .eq('is_active', true)

  if (fetchErr || !clinics?.length) {
    logger.info('No active ezyVet clinics to sync', 'ezyvet-cron')
    return { ok: true, message: 'No active clinics', synced: 0 }
  }

  const results: Array<{ clinic: string; status: string; error?: string }> = []

  // Sync each clinic sequentially to avoid rate limit collisions
  for (const clinic of clinics) {
    try {
      const ezyClinic = clinic as EzyVetClinic
      // Only sync recent changes (last 6 hours overlap for safety)
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

      // Core sync: users, appointments, consults
      await syncAll(supabase, ezyClinic, { since, triggeredBy: 'cron' })

      // Analytics sync: invoice lines, contacts, referral partner stats
      await syncAllAnalytics(supabase, ezyClinic, { since, triggeredBy: 'cron' })

      results.push({ clinic: ezyClinic.label, status: 'completed' })
    } catch (err) {
      logger.error(`Cron sync failed for ${clinic.label}`, err instanceof Error ? err : null, 'ezyvet-cron')
      results.push({ clinic: clinic.label, status: 'failed', error: (err as Error).message })
    }
  }

  logger.info('ezyVet cron sync complete', 'ezyvet-cron', {
    total: clinics.length,
    succeeded: results.filter((r) => r.status === 'completed').length,
    failed: results.filter((r) => r.status === 'failed').length,
  })

  return { ok: true, results }
})
