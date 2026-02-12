/**
 * ezyVet Sync Services
 *
 * Pulls data from the ezyVet API and upserts it into
 * the corresponding Supabase tables. Each sync function
 * creates an audit-log entry in `ezyvet_api_sync_log`.
 *
 * Endpoints used:
 *  - GET /v4/user        → ezyvet_users
 *  - GET /v2/appointment → ezyvet_appointments
 *  - GET /v1/consult     → ezyvet_consults
 */

import { logger } from '../logger'
import { ezyvetFetchAll } from './client'
import type {
  EzyVetClinic,
  EzyVetUser,
  EzyVetAppointment,
  EzyVetConsult,
  SyncType,
} from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Helpers ──────────────────────────────────────────────────
async function createSyncLog(
  supabase: SupabaseClient,
  clinicId: string,
  syncType: SyncType,
  triggeredBy: string
) {
  const { data } = await supabase
    .from('ezyvet_api_sync_log')
    .insert({
      clinic_id: clinicId,
      sync_type: syncType,
      status: 'running',
      triggered_by: triggeredBy,
    })
    .select('id')
    .single()

  return data?.id as string
}

async function completeSyncLog(
  supabase: SupabaseClient,
  logId: string,
  updates: {
    status: 'completed' | 'failed'
    records_fetched?: number
    records_upserted?: number
    records_errored?: number
    error_details?: Record<string, unknown>
  }
) {
  await supabase
    .from('ezyvet_api_sync_log')
    .update({ ...updates, completed_at: new Date().toISOString() })
    .eq('id', logId)
}

// ─── User Sync ────────────────────────────────────────────────
export async function syncUsers(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  triggeredBy = 'manual'
): Promise<{ fetched: number; upserted: number; errors: number }> {
  const logId = await createSyncLog(supabase, clinic.id, 'users', triggeredBy)

  try {
    const users = await ezyvetFetchAll<{ user: EzyVetUser }>(
      supabase,
      clinic,
      '/v4/user'
    )

    const rows = users.map((item) => {
      const u = item.user ?? item
      return {
        clinic_id: clinic.id,
        ezyvet_id: u.id,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        email: u.email || null,
        role: u.role || null,
        is_active: u.active ?? true,
        raw_json: u,
        synced_at: new Date().toISOString(),
      }
    })

    let upserted = 0
    let errored = 0

    // Batch upsert in chunks of 200
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error } = await supabase
        .from('ezyvet_users')
        .upsert(chunk, { onConflict: 'clinic_id,ezyvet_id' })

      if (error) {
        logger.error('User upsert batch error', error, 'ezyvet-sync', { batch: i })
        errored += chunk.length
      } else {
        upserted += chunk.length
      }
    }

    await completeSyncLog(supabase, logId, {
      status: 'completed',
      records_fetched: users.length,
      records_upserted: upserted,
      records_errored: errored,
    })

    return { fetched: users.length, upserted, errors: errored }
  } catch (err) {
    await completeSyncLog(supabase, logId, {
      status: 'failed',
      error_details: { message: (err as Error).message },
    })
    throw err
  }
}

// ─── Appointment Sync ─────────────────────────────────────────
export async function syncAppointments(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: {
    /** ISO date: only sync appointments after this date */
    since?: string
    triggeredBy?: string
  } = {}
): Promise<{ fetched: number; upserted: number; errors: number }> {
  const triggeredBy = options.triggeredBy ?? 'manual'
  const logId = await createSyncLog(supabase, clinic.id, 'appointments', triggeredBy)

  try {
    const params: Record<string, string | number> = {}
    if (options.since) {
      // ezyVet v2 appointments use Unix timestamps for date filtering
      params.modified_since = Math.floor(new Date(options.since).getTime() / 1000)
    }

    const appointments = await ezyvetFetchAll<{ appointment: EzyVetAppointment }>(
      supabase,
      clinic,
      '/v2/appointment',
      params
    )

    const rows = appointments.map((item) => {
      const a = item.appointment ?? item
      return {
        clinic_id: clinic.id,
        ezyvet_id: a.id,
        start_at: a.start_at ? new Date(a.start_at * 1000).toISOString() : null,
        end_at: a.end_at ? new Date(a.end_at * 1000).toISOString() : null,
        type_id: a.appointment_type_id ?? null,
        type_name: a.appointment_type_name ?? null,
        status_id: a.status_id ?? null,
        status_name: a.status_name ?? null,
        description: a.description ?? null,
        animal_id: a.animal_id ?? null,
        animal_name: a.animal_name ?? null,
        contact_id: a.contact_id ?? null,
        contact_name: a.contact_name ?? null,
        resource_id: a.resource_id ?? null,
        resource_name: a.resource_name ?? null,
        created_by_user_id: a.created_by_user_id ?? null,
        provider_user_id: null, // populated by enrichment step
        provider_name: null,
        raw_json: a,
        synced_at: new Date().toISOString(),
      }
    })

    let upserted = 0
    let errored = 0

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error } = await supabase
        .from('ezyvet_appointments')
        .upsert(chunk, { onConflict: 'clinic_id,ezyvet_id' })

      if (error) {
        logger.error('Appointment upsert batch error', error, 'ezyvet-sync', { batch: i })
        errored += chunk.length
      } else {
        upserted += chunk.length
      }
    }

    await completeSyncLog(supabase, logId, {
      status: 'completed',
      records_fetched: appointments.length,
      records_upserted: upserted,
      records_errored: errored,
    })

    return { fetched: appointments.length, upserted, errors: errored }
  } catch (err) {
    await completeSyncLog(supabase, logId, {
      status: 'failed',
      error_details: { message: (err as Error).message },
    })
    throw err
  }
}

// ─── Consult Sync ─────────────────────────────────────────────
export async function syncConsults(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: {
    since?: string
    triggeredBy?: string
  } = {}
): Promise<{ fetched: number; upserted: number; errors: number }> {
  const triggeredBy = options.triggeredBy ?? 'manual'
  const logId = await createSyncLog(supabase, clinic.id, 'consults', triggeredBy)

  try {
    const params: Record<string, string | number> = {}
    if (options.since) {
      params.modified_since = Math.floor(new Date(options.since).getTime() / 1000)
    }

    const consults = await ezyvetFetchAll<{ consult: EzyVetConsult }>(
      supabase,
      clinic,
      '/v1/consult',
      params
    )

    const rows = consults.map((item) => {
      const c = item.consult ?? item
      return {
        clinic_id: clinic.id,
        ezyvet_id: c.id,
        consult_type_id: c.consult_type_id ?? null,
        consult_type_name: c.consult_type_name ?? null,
        status: c.status ?? null,
        animal_id: c.animal_id ?? null,
        animal_name: c.animal_name ?? null,
        contact_id: c.contact_id ?? null,
        vet_user_id: c.vet_user_id ?? null,
        vet_name: c.vet_name ?? null,
        tech_user_id: c.tech_user_id ?? null,
        tech_name: c.tech_name ?? null,
        date_created: c.date_created ?? null,
        date_completed: c.date_completed ?? null,
        raw_json: c,
        synced_at: new Date().toISOString(),
      }
    })

    let upserted = 0
    let errored = 0

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error } = await supabase
        .from('ezyvet_consults')
        .upsert(chunk, { onConflict: 'clinic_id,ezyvet_id' })

      if (error) {
        logger.error('Consult upsert batch error', error, 'ezyvet-sync', { batch: i })
        errored += chunk.length
      } else {
        upserted += chunk.length
      }
    }

    await completeSyncLog(supabase, logId, {
      status: 'completed',
      records_fetched: consults.length,
      records_upserted: upserted,
      records_errored: errored,
    })

    return { fetched: consults.length, upserted, errors: errored }
  } catch (err) {
    await completeSyncLog(supabase, logId, {
      status: 'failed',
      error_details: { message: (err as Error).message },
    })
    throw err
  }
}

// ─── Full Sync ────────────────────────────────────────────────
export async function syncAll(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: { since?: string; triggeredBy?: string } = {}
): Promise<{
  users: { fetched: number; upserted: number; errors: number }
  appointments: { fetched: number; upserted: number; errors: number }
  consults: { fetched: number; upserted: number; errors: number }
}> {
  logger.info(`Starting full ezyVet sync for ${clinic.label}`, 'ezyvet-sync')

  const [users, appointments, consults] = await Promise.all([
    syncUsers(supabase, clinic, options.triggeredBy),
    syncAppointments(supabase, clinic, options),
    syncConsults(supabase, clinic, options),
  ])

  logger.info('Full ezyVet sync complete', 'ezyvet-sync', {
    clinic: clinic.label,
    users: users.upserted,
    appointments: appointments.upserted,
    consults: consults.upserted,
  })

  return { users, appointments, consults }
}
