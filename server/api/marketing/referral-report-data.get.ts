/**
 * Fetch referral revenue line items + clinic visits + partner stats for report generation.
 *
 * Uses the service-role client so RLS on referral_revenue_line_items
 * (admin-only) doesn't block marketing-admin users.
 *
 * Line items are filtered server-side by transaction_date (ISO TEXT, supports gte/lte).
 *
 * Query params:
 *   from  — ISO date string (inclusive start)
 *   to    — ISO date string (inclusive end)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    // Auth check — must be logged in
    const supabaseUser = await serverSupabaseClient(event)
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) throw createError({ statusCode: 401, message: 'Not authenticated' })

    const { from, to } = getQuery(event) as { from?: string; to?: string }
    if (!from || !to) throw createError({ statusCode: 400, message: 'from and to query params required' })

    const db = await serverSupabaseServiceRole(event)

    // Fetch line items filtered by date range server-side
    // transaction_date is stored as ISO TEXT (YYYY-MM-DD), so text comparison works correctly
    let allLineItems: any[] = []
    let lineError: any = null
    const PAGE_SIZE = 1000
    let offset = 0
    let keepFetching = true

    while (keepFetching) {
      const { data, error } = await db
        .from('referral_revenue_line_items')
        .select('partner_id, transaction_date, amount, csv_clinic_name, division')
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .not('partner_id', 'is', null)
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        lineError = error
        break
      }
      if (data && data.length > 0) {
        allLineItems = allLineItems.concat(data)
        offset += PAGE_SIZE
        if (data.length < PAGE_SIZE) keepFetching = false
      } else {
        keepFetching = false
      }
    }

    if (lineError) {
      if (lineError.code === 'PGRST205' || lineError.message?.includes('Could not find')) {
        console.warn('[referral-report-data] referral_revenue_line_items table not found, returning empty line items')
      } else {
        console.error('[referral-report-data] lineItems query error:', lineError)
        throw createError({ statusCode: 500, message: lineError.message })
      }
    }

    // Fetch clinic visits in the date range (visit_date is a proper DATE column)
    const { data: visits, error: visitError } = await db
      .from('clinic_visits')
      .select('id, visit_date, partner_id, clinic_name, spoke_to, items_discussed, visit_notes')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .order('visit_date', { ascending: false })

    if (visitError) {
      console.error('[referral-report-data] visits query error:', visitError)
      throw createError({ statusCode: 500, message: visitError.message })
    }

    // Fetch partner metadata for joining (name, zone, tier)
    const { data: partnerStats, error: psError } = await db
      .from('referral_partners')
      .select('id, hospital_name, name, zone, tier, status, total_referrals_all_time, total_revenue_all_time, last_referral_date, created_at')

    if (psError) {
      console.error('[referral-report-data] partnerStats query error:', psError)
    }

    return {
      lineItems: allLineItems,
      visits: visits || [],
      partnerStats: partnerStats || [],
      lineItemCount: allLineItems.length,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[referral-report-data] Unexpected error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Internal server error' })
  }
})
