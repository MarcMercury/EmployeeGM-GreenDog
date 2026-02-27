/**
 * Fetch referral revenue line items + clinic visits for report generation.
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
  // Auth check — must be logged in
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Not authenticated' })

  const { from, to } = getQuery(event) as { from?: string; to?: string }
  if (!from || !to) throw createError({ statusCode: 400, message: 'from and to query params required' })

  const db = await serverSupabaseServiceRole(event)

  // Fetch all line items (transaction_date is TEXT, so we filter client-side)
  const { data: lineItems, error: lineError } = await db
    .from('referral_revenue_line_items')
    .select('partner_id, transaction_date, amount')

  if (lineError) throw createError({ statusCode: 500, message: lineError.message })

  // Fetch clinic visits in the date range (visit_date is a proper DATE column)
  const { data: visits, error: visitError } = await db
    .from('clinic_visits')
    .select('id, visit_date, partner_id, clinic_name, spoke_to, items_discussed, visit_notes')
    .gte('visit_date', from)
    .lte('visit_date', to)
    .order('visit_date', { ascending: false })

  if (visitError) throw createError({ statusCode: 500, message: visitError.message })

  return { lineItems: lineItems || [], visits: visits || [] }
})
