/**
 * ezyVet Analytics Sync Services
 *
 * Extended sync services that pull data directly from the ezyVet API
 * and feed into existing analytics tables, replacing manual CSV uploads.
 *
 * Endpoints used:
 *  - GET /v1/invoiceline   → invoice_lines (feeds Invoice Analysis page)
 *  - GET /v1/contact       → ezyvet_crm_contacts (feeds EzyVet Analytics page)
 *
 * Also cross-references contacts against referral_partners to auto-update
 * referral statistics (visit counts, revenue, last visit).
 */

import { logger } from '../logger'
import { ezyvetFetchAll } from './client'
import type {
  EzyVetClinic,
  EzyVetInvoiceLine,
  EzyVetContact,
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

// ─── Invoice Line Sync ────────────────────────────────────────
/**
 * Pulls invoice lines from ezyVet GET /v1/invoiceline and upserts
 * into the existing `invoice_lines` table used by Invoice Analysis.
 */
export async function syncInvoiceLines(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: {
    since?: string
    triggeredBy?: string
  } = {}
): Promise<{ fetched: number; upserted: number; errors: number }> {
  const triggeredBy = options.triggeredBy ?? 'manual'
  const logId = await createSyncLog(supabase, clinic.id, 'invoices', triggeredBy)

  try {
    const params: Record<string, string | number> = {}
    if (options.since) {
      params.modified_since = Math.floor(new Date(options.since).getTime() / 1000)
    }

    logger.info(`Starting invoice line sync for ${clinic.label}`, 'ezyvet-sync-analytics', {
      since: options.since || 'all',
    })

    const items = await ezyvetFetchAll<{ invoiceline: EzyVetInvoiceLine }>(
      supabase,
      clinic,
      '/v1/invoiceline',
      params
    )

    logger.info(`Fetched ${items.length} invoice lines from ezyVet`, 'ezyvet-sync-analytics')

    const rows = items.map((item) => {
      const il = item.invoiceline ?? item
      return {
        // Use invoice_number + invoice_line_reference as the dedup key
        invoice_number: il.invoice_id ? String(il.invoice_id) : null,
        invoice_line_reference: il.invoice_line_reference || (il.id ? String(il.id) : null),
        invoice_date: il.date_created || null,
        invoice_date_modified: il.date_modified || null,
        client_code: il.contact_code || (il.contact_id ? String(il.contact_id) : null),
        client_first_name: il.contact_name || null,
        pet_name: il.animal_name || null,
        product_name: il.product_name || null,
        product_group: il.product_group || null,
        account: il.account || null,
        department: il.department || null,
        standard_price: il.unit_price ?? null,
        discount: il.discount_percentage ?? il.discount_amount ?? null,
        price_after_discount: il.line_total ?? null,
        total_tax_amount: il.total_tax ?? null,
        total_earned: il.total_earned ?? il.line_total ?? null,
        staff_member: il.staff_name || null,
        case_owner: il.case_owner_name || null,
        division: il.division || null,
        invoice_type: il.invoice_type || null,
        payment_terms: il.payment_terms || null,
        consult_id: il.consult_id ? String(il.consult_id) : null,
        // Tag this record as API-sourced
        source: 'ezyvet_api',
        synced_at: new Date().toISOString(),
      }
    })

    let upserted = 0
    let errored = 0

    // Batch upsert in chunks of 200
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error } = await supabase
        .from('invoice_lines')
        .upsert(chunk, { onConflict: 'invoice_number,invoice_line_reference' })

      if (error) {
        logger.error('Invoice line upsert batch error', error, 'ezyvet-sync-analytics', { batch: i })
        errored += chunk.length
      } else {
        upserted += chunk.length
      }
    }

    // Record upload in invoice_upload_history for continuity with the UI
    await supabase.from('invoice_upload_history').insert({
      file_name: `ezyvet_api_sync_${new Date().toISOString().split('T')[0]}`,
      total_rows: items.length,
      inserted: upserted,
      duplicates_skipped: 0,
      errors: errored,
      uploaded_by: triggeredBy,
      source: 'ezyvet_api',
    })

    await completeSyncLog(supabase, logId, {
      status: 'completed',
      records_fetched: items.length,
      records_upserted: upserted,
      records_errored: errored,
    })

    logger.info('Invoice line sync complete', 'ezyvet-sync-analytics', { fetched: items.length, upserted, errored })

    return { fetched: items.length, upserted, errors: errored }
  } catch (err) {
    logger.error('Invoice line sync failed', err instanceof Error ? err : null, 'ezyvet-sync-analytics')
    await completeSyncLog(supabase, logId, {
      status: 'failed',
      error_details: { message: (err as Error).message },
    })
    throw err
  }
}

// ─── Contact Sync ─────────────────────────────────────────────
/**
 * Pulls contacts from ezyVet GET /v1/contact and upserts into
 * `ezyvet_crm_contacts` (feeds EzyVet Analytics page).
 */
export async function syncContacts(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: {
    since?: string
    triggeredBy?: string
  } = {}
): Promise<{ fetched: number; upserted: number; errors: number }> {
  const triggeredBy = options.triggeredBy ?? 'manual'
  const logId = await createSyncLog(supabase, clinic.id, 'contacts', triggeredBy)

  try {
    const params: Record<string, string | number> = {}
    if (options.since) {
      params.modified_since = Math.floor(new Date(options.since).getTime() / 1000)
    }

    logger.info(`Starting contact sync for ${clinic.label}`, 'ezyvet-sync-analytics', {
      since: options.since || 'all',
    })

    const items = await ezyvetFetchAll<{ contact: EzyVetContact }>(
      supabase,
      clinic,
      '/v1/contact',
      params
    )

    logger.info(`Fetched ${items.length} contacts from ezyVet`, 'ezyvet-sync-analytics')

    const rows = items.map((item) => {
      const c = item.contact ?? item
      return {
        ezyvet_contact_code: c.contact_code || (c.id ? String(c.id) : null),
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        email: c.email || null,
        phone_mobile: c.phone_mobile || null,
        address_city: c.address_physical_city || null,
        address_zip: c.address_physical_postcode || null,
        revenue_ytd: c.revenue_ytd ?? null,
        last_visit: c.last_invoiced_date || null,
        division: c.division || null,
        referral_source: c.hear_about_option || null,
        is_active: c.is_active ?? true,
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        source: 'ezyvet_api',
      }
    })

    let upserted = 0
    let errored = 0

    // Batch upsert in chunks of 200 (keyed on ezyvet_contact_code)
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { error } = await supabase
        .from('ezyvet_crm_contacts')
        .upsert(chunk, { onConflict: 'ezyvet_contact_code' })

      if (error) {
        logger.error('Contact upsert batch error', error, 'ezyvet-sync-analytics', { batch: i })
        errored += chunk.length
      } else {
        upserted += chunk.length
      }
    }

    // Record the sync in the contacts sync log (best effort)
    try {
      await supabase.from('ezyvet_crm_sync_log').insert({
        total_rows: items.length,
        inserted: upserted - (await getExistingCount(supabase)),
        updated: 0,
        errors: errored,
        source: 'ezyvet_api',
        completed_at: new Date().toISOString(),
      })
    } catch { /* best effort */ }

    await completeSyncLog(supabase, logId, {
      status: 'completed',
      records_fetched: items.length,
      records_upserted: upserted,
      records_errored: errored,
    })

    logger.info('Contact sync complete', 'ezyvet-sync-analytics', { fetched: items.length, upserted, errored })

    return { fetched: items.length, upserted, errors: errored }
  } catch (err) {
    logger.error('Contact sync failed', err instanceof Error ? err : null, 'ezyvet-sync-analytics')
    await completeSyncLog(supabase, logId, {
      status: 'failed',
      error_details: { message: (err as Error).message },
    })
    throw err
  }
}

// Simple helper to get approximate existing count (best effort)
async function getExistingCount(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('ezyvet_crm_contacts')
    .select('*', { count: 'exact', head: true })
  return count || 0
}

// ─── Referral Stats Auto-Update ───────────────────────────────
/**
 * After a contact sync, cross-references referral sources with
 * the `referral_partners` table and updates their referral counts,
 * revenue totals, and last referral date.
 *
 * This replaces the manual "Upload EzyVet Report" button in the
 * Partnerships/Referral CRM page.
 */
export async function updateReferralStatsFromContacts(
  supabase: SupabaseClient
): Promise<{
  partnersUpdated: number
  totalReferrals: number
  totalRevenue: number
}> {
  logger.info('Updating referral partner stats from contact data', 'ezyvet-sync-analytics')

  try {
    // 1. Get all referral partners
    const { data: partners, error: partnerError } = await supabase
      .from('referral_partners')
      .select('id, hospital_name')

    if (partnerError) throw partnerError
    if (!partners || partners.length === 0) {
      logger.info('No referral partners found, skipping referral stats update', 'ezyvet-sync-analytics')
      return { partnersUpdated: 0, totalReferrals: 0, totalRevenue: 0 }
    }

    // 2. Build a map of partner names for matching
    const partnerMap = new Map<string, { id: string; name: string }>()
    for (const p of partners) {
      const normName = (p.hospital_name || '').toLowerCase().trim()
      if (normName) partnerMap.set(normName, { id: p.id, name: p.hospital_name })
    }

    // 3. Query contacts with referral sources
    const { data: referralContacts, error: contactError } = await supabase
      .from('ezyvet_crm_contacts')
      .select('referral_source, revenue_ytd, last_visit')
      .not('referral_source', 'is', null)

    if (contactError) throw contactError

    // 4. Aggregate by referral source → partner match
    const stats = new Map<string, { referrals: number; revenue: number; lastVisit: string | null }>()

    for (const contact of (referralContacts || [])) {
      const source = (contact.referral_source || '').toLowerCase().trim()
      if (!source) continue

      // Try to match to a partner
      const match = partnerMap.get(source)
      if (!match) continue

      const existing = stats.get(match.id) || { referrals: 0, revenue: 0, lastVisit: null }
      existing.referrals++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0

      if (contact.last_visit) {
        if (!existing.lastVisit || contact.last_visit > existing.lastVisit) {
          existing.lastVisit = contact.last_visit
        }
      }

      stats.set(match.id, existing)
    }

    // 5. Update partner records
    let partnersUpdated = 0
    let totalReferrals = 0
    let totalRevenue = 0

    for (const [partnerId, stat] of Array.from(stats)) {
      const { error: updateError } = await supabase
        .from('referral_partners')
        .update({
          total_referrals_all_time: stat.referrals,
          total_revenue_all_time: stat.revenue,
          last_contact_date: stat.lastVisit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId)

      if (!updateError) {
        partnersUpdated++
        totalReferrals += stat.referrals
        totalRevenue += stat.revenue
      }
    }

    logger.info('Referral partner stats updated', 'ezyvet-sync-analytics', {
      partnersUpdated,
      totalReferrals,
      totalRevenue,
    })

    return { partnersUpdated, totalReferrals, totalRevenue }
  } catch (err) {
    logger.error('Referral stats update failed', err instanceof Error ? err : null, 'ezyvet-sync-analytics')
    throw err
  }
}

// ─── Extended Full Sync ───────────────────────────────────────
/**
 * Runs all analytics-related syncs: invoices, contacts, then referral update.
 * Designed to be called from the cron job or manual trigger.
 */
export async function syncAllAnalytics(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  options: { since?: string; triggeredBy?: string } = {}
): Promise<{
  invoices: { fetched: number; upserted: number; errors: number }
  contacts: { fetched: number; upserted: number; errors: number }
  referrals: { partnersUpdated: number; totalReferrals: number; totalRevenue: number }
}> {
  logger.info(`Starting full analytics sync for ${clinic.label}`, 'ezyvet-sync-analytics')

  // Run invoice and contact syncs in parallel
  const [invoices, contacts] = await Promise.all([
    syncInvoiceLines(supabase, clinic, options),
    syncContacts(supabase, clinic, options),
  ])

  // After contacts are synced, update referral stats
  const referrals = await updateReferralStatsFromContacts(supabase)

  logger.info('Full analytics sync complete', 'ezyvet-sync-analytics', {
    clinic: clinic.label,
    invoicesUpserted: invoices.upserted,
    contactsUpserted: contacts.upserted,
    referralPartnersUpdated: referrals.partnersUpdated,
  })

  return { invoices, contacts, referrals }
}
