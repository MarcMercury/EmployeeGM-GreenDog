/**
 * Fetch referral revenue line items + clinic visits + partner stats for report generation.
 *
 * Uses the service-role client so RLS on referral_revenue_line_items
 * (admin-only) doesn't block marketing-admin users.
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

    // Fetch ALL line items — remove default 1000-row limit
    // (transaction_date is TEXT, so we filter client-side)
    let allLineItems: any[] = []
    let lineError: any = null
    const PAGE_SIZE = 1000
    let offset = 0
    let keepFetching = true

    while (keepFetching) {
      const { data, error } = await db
        .from('referral_revenue_line_items')
        .select('partner_id, transaction_date, amount')
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
      // If the table doesn't exist yet (migration not applied), return empty data
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

    // Fetch partner-level referral/revenue stats for fallback
    const { data: partnerStats, error: psError } = await db
      .from('referral_partners')
      .select('id, hospital_name, name, zone, tier, status, total_referrals, total_referrals_all_time, total_revenue_all_time, last_referral_date, revenue_ytd, revenue_last_year, created_at')

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
    // Re-throw H3 errors (401, 400, etc.) as-is
    if (err.statusCode) throw err
    console.error('[referral-report-data] Unexpected error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Internal server error' })
  }
})
