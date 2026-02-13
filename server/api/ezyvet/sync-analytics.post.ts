/**
 * Analytics Sync API
 *
 * POST /api/ezyvet/sync-analytics
 *
 * Triggers a sync of invoice lines, contacts, and referral stats
 * from the ezyVet API. Replaces manual CSV uploads for:
 *   - Invoice Analysis page
 *   - EzyVet Analytics page
 *   - Referral CRM (automatic partner stats update)
 *
 * Body: { syncType: 'invoices' | 'contacts' | 'referrals' | 'all', clinicId?: string }
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import {
  syncInvoiceLines,
  syncContacts,
  updateReferralStatsFromContacts,
  syncAllAnalytics,
} from '~/server/utils/ezyvet/sync-analytics'
import type { EzyVetClinic } from '~/server/utils/ezyvet/types'

export default defineEventHandler(async (event) => {
  // Auth check
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const syncType = body?.syncType || 'all'
  const clinicId = body?.clinicId as string | undefined

  // Fetch clinic configuration
  let clinicQuery = supabase
    .from('ezyvet_clinics')
    .select('*')
    .eq('is_active', true)

  if (clinicId) {
    clinicQuery = clinicQuery.eq('id', clinicId)
  }

  const { data: clinics, error: clinicError } = await clinicQuery

  if (clinicError || !clinics || clinics.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No active ezyVet clinic configuration found. Please set up API credentials in the ezyVet Integration page.',
    })
  }

  const results: Record<string, any> = {}

  for (const clinic of clinics as EzyVetClinic[]) {
    try {
      switch (syncType) {
        case 'invoices':
          results[clinic.label] = {
            invoices: await syncInvoiceLines(supabase, clinic, { triggeredBy: user.email || 'admin' }),
          }
          break
        case 'contacts':
          results[clinic.label] = {
            contacts: await syncContacts(supabase, clinic, { triggeredBy: user.email || 'admin' }),
          }
          break
        case 'referrals':
          results[clinic.label] = {
            referrals: await updateReferralStatsFromContacts(supabase),
          }
          break
        case 'all':
        default:
          results[clinic.label] = await syncAllAnalytics(supabase, clinic, {
            triggeredBy: user.email || 'admin',
          })
          break
      }
    } catch (err: any) {
      results[clinic.label] = { error: err.message }
    }
  }

  return {
    success: true,
    syncType,
    clinicCount: clinics.length,
    results,
    syncedAt: new Date().toISOString(),
  }
})
