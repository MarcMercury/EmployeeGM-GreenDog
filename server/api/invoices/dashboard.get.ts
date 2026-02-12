/**
 * Invoice Dashboard Aggregation API
 *
 * GET /api/invoices/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&location=...
 *
 * Returns pre-computed aggregations from the database using the
 * get_invoice_dashboard() SQL function. This bypasses the 1000-row
 * PostgREST limit by running all aggregations server-side in SQL.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const startDate = (query.startDate as string) || null
  const endDate = (query.endDate as string) || null
  const location = (query.location as string) || null

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('get_invoice_dashboard', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_location: location,
  })

  if (error) {
    console.error('Dashboard RPC error:', error)
    throw createError({ statusCode: 500, message: 'Failed to load dashboard data: ' + error.message })
  }

  // Also fetch metadata that doesn't change with filters
  const { count: totalUploads } = await supabase
    .from('invoice_upload_history')
    .select('*', { count: 'exact', head: true })

  const { count: analysisRuns } = await supabase
    .from('invoice_analysis_runs')
    .select('*', { count: 'exact', head: true })

  // Fetch latest completed analysis
  const { data: latestRun } = await supabase
    .from('invoice_analysis_runs')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch location options (distinct departments)
  const { data: locations } = await supabase
    .from('invoice_lines')
    .select('department')
    .not('department', 'is', null)
    .neq('department', '')
    .limit(1000)

  const locationOptions = [...new Set((locations || []).map((r: any) => r.department))].sort()

  // Fetch product group options
  const { data: pgRows } = await supabase
    .from('invoice_lines')
    .select('product_group')
    .not('product_group', 'is', null)
    .neq('product_group', '')
    .limit(1000)

  const productGroupOptions = [...new Set((pgRows || []).map((r: any) => r.product_group))].sort()

  return {
    ...data,
    totalUploads: totalUploads || 0,
    analysisRuns: analysisRuns || 0,
    latestAnalysis: latestRun
      ? {
          revenueSummary: latestRun.revenue_summary,
          trendAnalysis: latestRun.trend_analysis,
          topProducts: latestRun.top_products,
          departmentBreakdown: latestRun.department_breakdown,
          staffPerformance: latestRun.staff_performance,
          insights: latestRun.insights,
          recommendations: latestRun.recommendations,
        }
      : null,
    locationOptions,
    productGroupOptions,
  }
})
