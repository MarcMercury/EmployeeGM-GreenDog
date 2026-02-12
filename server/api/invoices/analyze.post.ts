/**
 * Invoice Analysis AI Endpoint
 *
 * POST /api/invoices/analyze
 *
 * Analyzes invoice line data using GPT-4 to produce:
 * - Revenue breakdowns by department, product group, staff
 * - Trend analysis (MoM, YoY)
 * - Top revenue products and services
 * - Key insights and recommendations
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

  const body = await readBody(event)
  const { location, division, startDate, endDate } = body
  const locationFilter = location || division || null

  const config = useRuntimeConfig()
  const openaiKey = config.openaiApiKey

  if (!openaiKey) {
    throw createError({ statusCode: 503, message: 'AI service not configured. Please add OPENAI_API_KEY.' })
  }

  try {
    // 1. Create analysis run record
    const { data: run, error: runError } = await supabase
      .from('invoice_analysis_runs')
      .insert({
        division: locationFilter,
        analysis_period_start: startDate,
        analysis_period_end: endDate,
        status: 'running',
        created_by: profile.id,
      })
      .select()
      .single()

    if (runError) throw runError

    // 2. Fetch invoice data for the period
    let query = supabase
      .from('invoice_lines')
      .select('invoice_date, product_name, product_group, department, account, division, standard_price, discount, price_after_discount, total_tax_amount, total_earned, staff_member, case_owner, client_code, invoice_type, payment_terms')

    if (startDate) query = query.gte('invoice_date', startDate)
    if (endDate) query = query.lte('invoice_date', endDate)
    if (locationFilter) query = query.eq('department', locationFilter)

    query = query.order('invoice_date')

    const { data: invoices, error: invError } = await query.limit(50000)
    if (invError) throw invError

    if (!invoices || invoices.length === 0) {
      await supabase.from('invoice_analysis_runs').update({ status: 'failed' }).eq('id', run.id)
      throw createError({ statusCode: 400, message: 'No invoice data found for the selected period.' })
    }

    // 3. Compute aggregations for AI context
    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_earned as string) || 0), 0)
    const totalLines = invoices.length

    // Department breakdown
    const deptMap: Record<string, { revenue: number; count: number }> = {}
    for (const inv of invoices) {
      const dept = inv.department || 'Unknown'
      if (!deptMap[dept]) deptMap[dept] = { revenue: 0, count: 0 }
      deptMap[dept].revenue += parseFloat(inv.total_earned as string) || 0
      deptMap[dept].count++
    }

    // Product group breakdown
    const pgMap: Record<string, { revenue: number; count: number }> = {}
    for (const inv of invoices) {
      const pg = inv.product_group || 'Unknown'
      if (!pgMap[pg]) pgMap[pg] = { revenue: 0, count: 0 }
      pgMap[pg].revenue += parseFloat(inv.total_earned as string) || 0
      pgMap[pg].count++
    }

    // Staff breakdown
    const staffMap: Record<string, { revenue: number; count: number; clients: Set<string> }> = {}
    for (const inv of invoices) {
      const staff = inv.staff_member || 'Unknown'
      if (!staffMap[staff]) staffMap[staff] = { revenue: 0, count: 0, clients: new Set() }
      staffMap[staff].revenue += parseFloat(inv.total_earned as string) || 0
      staffMap[staff].count++
      if (inv.client_code) staffMap[staff].clients.add(inv.client_code)
    }

    // Monthly trend
    const monthMap: Record<string, { revenue: number; count: number; clients: Set<string> }> = {}
    for (const inv of invoices) {
      if (!inv.invoice_date) continue
      const monthKey = inv.invoice_date.toString().substring(0, 7) // YYYY-MM
      if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, count: 0, clients: new Set() }
      monthMap[monthKey].revenue += parseFloat(inv.total_earned as string) || 0
      monthMap[monthKey].count++
      if (inv.client_code) monthMap[monthKey].clients.add(inv.client_code)
    }

    // Top products
    const productMap: Record<string, { revenue: number; count: number }> = {}
    for (const inv of invoices) {
      const product = inv.product_name || 'Unknown'
      if (!productMap[product]) productMap[product] = { revenue: 0, count: 0 }
      productMap[product].revenue += parseFloat(inv.total_earned as string) || 0
      productMap[product].count++
    }

    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 30)
      .map(([name, data]) => ({ name, revenue: Math.round(data.revenue * 100) / 100, count: data.count }))

    // Serialize for AI
    const staffSummary = Object.entries(staffMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 20)
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue * 100) / 100,
        lineCount: data.count,
        uniqueClients: data.clients.size,
      }))

    const monthlyTrend = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        lineCount: data.count,
        uniqueClients: data.clients.size,
      }))

    // 4. Call OpenAI for analysis
    const prompt = `You are a veterinary business analytics expert. Analyze the following invoice data from a veterinary hospital and dental center (Green Dog Dental & Veterinary Center).

DATA SUMMARY:
- Period: ${startDate} to ${endDate}
- Total invoice lines: ${totalLines.toLocaleString()}
- Total revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${division ? `- Division: ${division}` : '- All divisions'}

DEPARTMENT BREAKDOWN:
${Object.entries(deptMap).sort((a, b) => b[1].revenue - a[1].revenue).map(([dept, d]) => `  ${dept}: $${d.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${d.count} lines)`).join('\n')}

PRODUCT GROUP BREAKDOWN:
${Object.entries(pgMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20).map(([pg, d]) => `  ${pg}: $${d.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${d.count} lines)`).join('\n')}

TOP REVENUE PRODUCTS:
${topProducts.slice(0, 15).map(p => `  ${p.name}: $${p.revenue.toLocaleString()} (${p.count} lines)`).join('\n')}

STAFF REVENUE:
${staffSummary.map(s => `  ${s.name}: $${s.revenue.toLocaleString()} | ${s.lineCount} lines | ${s.uniqueClients} clients`).join('\n')}

MONTHLY TREND:
${monthlyTrend.map(m => `  ${m.month}: $${m.revenue.toLocaleString()} | ${m.lineCount} lines | ${m.uniqueClients} clients`).join('\n')}

Please provide a comprehensive analysis as JSON with these exact keys:
{
  "revenueSummary": {
    "totalRevenue": number,
    "avgRevenuePerLine": number,
    "avgRevenuePerInvoice": number,
    "topDepartment": string,
    "topProductGroup": string,
    "growthIndicator": "growing" | "stable" | "declining"
  },
  "trendAnalysis": {
    "monthOverMonth": [{ "month": string, "revenue": number, "changePercent": number }],
    "seasonalPatterns": string,
    "projectedNextMonth": number
  },
  "topProducts": [{ "name": string, "revenue": number, "count": number, "percentOfTotal": number }],
  "departmentBreakdown": { "<dept>": { "revenue": number, "count": number, "avgTicket": number, "trend": "up"|"down"|"stable" } },
  "staffPerformance": [{ "name": string, "revenue": number, "lineCount": number, "uniqueClients": number, "avgPerClient": number }],
  "insights": [{ "type": "trend"|"opportunity"|"concern"|"achievement", "message": string, "severity": "info"|"warning"|"success" }],
  "recommendations": [{ "title": string, "description": string, "impact": "high"|"medium"|"low", "category": "revenue"|"efficiency"|"growth"|"cost" }]
}

Be specific with dollar amounts and percentages. Focus on actionable business insights for a veterinary practice.`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a veterinary business analytics expert. Respond with valid JSON only, no markdown code blocks.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('OpenAI error:', errText)
      await supabase.from('invoice_analysis_runs').update({ status: 'failed' }).eq('id', run.id)
      throw createError({ statusCode: 502, message: 'AI analysis failed: ' + aiResponse.statusText })
    }

    const aiData = await aiResponse.json() as any
    const analysisText = aiData.choices?.[0]?.message?.content || '{}'
    let analysis: any

    try {
      analysis = JSON.parse(analysisText)
    } catch {
      console.error('Failed to parse AI response:', analysisText)
      analysis = { insights: [{ type: 'concern', message: 'AI response could not be parsed', severity: 'warning' }] }
    }

    // 5. Update analysis run with results
    await supabase.from('invoice_analysis_runs').update({
      status: 'completed',
      revenue_summary: analysis.revenueSummary || {},
      trend_analysis: analysis.trendAnalysis || {},
      top_products: analysis.topProducts || topProducts,
      department_breakdown: analysis.departmentBreakdown || deptMap,
      staff_performance: analysis.staffPerformance || staffSummary,
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      total_lines_analyzed: totalLines,
      total_revenue_analyzed: totalRevenue,
      date_range_days: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000),
      ai_model: aiData.model || 'gpt-4o',
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)

    return {
      success: true,
      runId: run.id,
      totalLines,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      ...analysis,
      // Also return raw aggregations for charts
      _raw: {
        monthlyTrend,
        staffSummary,
        topProducts,
        departmentBreakdown: Object.entries(deptMap).map(([dept, d]) => ({
          department: dept,
          revenue: Math.round(d.revenue * 100) / 100,
          count: d.count,
        })),
        productGroupBreakdown: Object.entries(pgMap)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 15)
          .map(([pg, d]) => ({
            productGroup: pg,
            revenue: Math.round(d.revenue * 100) / 100,
            count: d.count,
          })),
      },
    }
  } catch (err: any) {
    console.error('Invoice analysis error:', err)
    throw createError({ statusCode: err.statusCode || 500, message: err.message || 'Analysis failed' })
  }
})
