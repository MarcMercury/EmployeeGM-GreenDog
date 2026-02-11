/**
 * Invoice Stats API
 *
 * GET /api/invoices/stats
 *
 * Returns aggregate statistics for the invoice lines data.
 * Used by the Invoice Analysis dashboard for summary cards.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const { startDate, endDate, division } = query as { startDate?: string; endDate?: string; division?: string }

  try {
    // Build shared filter
    let baseQuery = supabase.from('invoice_lines').select('*', { count: 'exact', head: false })
    if (startDate) baseQuery = baseQuery.gte('invoice_date', startDate)
    if (endDate) baseQuery = baseQuery.lte('invoice_date', endDate)
    if (division) baseQuery = baseQuery.eq('division', division)

    // Get total count
    const { count: totalCount } = await supabase
      .from('invoice_lines')
      .select('*', { count: 'exact', head: true })
      .gte('invoice_date', startDate || '1900-01-01')
      .lte('invoice_date', endDate || '2100-12-31')
      .then(res => {
        if (division) {
          // re-query with division
        }
        return res
      })

    // Get aggregated stats
    let statsQuery = supabase.from('invoice_lines').select('total_earned, department, product_group, division, staff_member, invoice_number, client_code, invoice_date')
    if (startDate) statsQuery = statsQuery.gte('invoice_date', startDate)
    if (endDate) statsQuery = statsQuery.lte('invoice_date', endDate)
    if (division) statsQuery = statsQuery.eq('division', division)

    const { data: lines, error } = await statsQuery.limit(50000)
    if (error) throw error

    const totalLines = lines?.length || 0
    const totalRevenue = lines?.reduce((sum, l) => sum + (parseFloat(l.total_earned as string) || 0), 0) || 0
    const uniqueInvoices = new Set(lines?.map(l => l.invoice_number).filter(Boolean)).size
    const uniqueDepartments = new Set(lines?.map(l => l.department).filter(Boolean)).size
    const uniqueProductGroups = new Set(lines?.map(l => l.product_group).filter(Boolean)).size
    const uniqueStaff = new Set(lines?.map(l => l.staff_member).filter(Boolean)).size
    const uniqueClients = new Set(lines?.map(l => l.client_code).filter(Boolean)).size
    const uniqueDivisions = [...new Set(lines?.map(l => l.division).filter(Boolean))]

    // Date range
    const dates = lines?.map(l => l.invoice_date).filter(Boolean).sort() || []
    const earliestDate = dates[0] || null
    const latestDate = dates[dates.length - 1] || null

    // Analysis run count
    const { count: analysisCount } = await supabase
      .from('invoice_analysis_runs')
      .select('*', { count: 'exact', head: true })

    // Upload history count
    const { count: uploadCount } = await supabase
      .from('invoice_upload_history')
      .select('*', { count: 'exact', head: true })

    return {
      totalLines,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      uniqueInvoices,
      uniqueDepartments,
      uniqueProductGroups,
      uniqueStaff,
      uniqueClients,
      divisions: uniqueDivisions,
      earliestDate,
      latestDate,
      analysisRuns: analysisCount || 0,
      totalUploads: uploadCount || 0,
    }
  } catch (err: any) {
    console.error('Invoice stats error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Failed to load stats' })
  }
})
