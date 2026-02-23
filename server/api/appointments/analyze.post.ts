/**
 * Appointment Analysis AI Endpoint
 * 
 * POST /api/appointments/analyze
 * 
 * Analyzes uploaded appointment data using GPT-4 to produce:
 * - Demand patterns per service per day of week
 * - Optimal service scheduling recommendations
 * - Staffing suggestions based on demand + employee skills
 * - Weekly plan that can be fed into the schedule wizard
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { getServiceDepartmentSummary, lookupAppointmentType } from '../../utils/appointments/clinic-report-parser'

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

  if (!profile || !['admin', 'super_admin', 'manager', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { locationId, weeksBack = 12, targetWeekStart } = body

  const config = useRuntimeConfig()
  const openaiKey = config.openaiApiKey

  if (!openaiKey) {
    throw createError({ statusCode: 503, message: 'AI service not configured. Please add OPENAI_API_KEY.' })
  }

  try {
    // 1. Create analysis run record
    const { data: run, error: runError } = await supabase
      .from('appointment_analysis_runs')
      .insert({
        location_id: locationId || null,
        analysis_period_start: new Date(Date.now() - weeksBack * 7 * 86400000).toISOString().split('T')[0],
        analysis_period_end: new Date().toISOString().split('T')[0],
        status: 'running',
        created_by: profile.id,
      })
      .select()
      .single()

    if (runError) throw runError

    // 2. Fetch appointment data
    let query = supabase
      .from('appointment_data')
      .select('appointment_date, appointment_type, service_category, species, status, revenue, provider_name, location_name')
      .gte('appointment_date', new Date(Date.now() - weeksBack * 7 * 86400000).toISOString().split('T')[0])
      .order('appointment_date')

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    if (!appointments || appointments.length === 0) {
      await supabase.from('appointment_analysis_runs').update({ status: 'failed' }).eq('id', run.id)
      throw createError({ statusCode: 400, message: 'No appointment data found for the selected period and location.' })
    }

    // 3. Fetch available services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, code, requires_dvm, is_active')
      .eq('is_active', true)
      .order('sort_order')

    // 4. Fetch staffing requirements
    const { data: staffingReqs } = await supabase
      .from('service_staffing_requirements')
      .select('service_id, role_category, role_label, min_count, max_count, is_required, default_start_time, default_end_time')
      .order('priority')

    // 5. Fetch employees with skills (for staffing suggestions)
    let empQuery = supabase
      .from('employees')
      .select(`
        id, first_name, last_name, 
        position_id, location_id,
        employee_skills(skill_id, skill_library(name, category))
      `)
      .eq('is_active', true)
      .eq('employment_status', 'active')

    if (locationId) {
      empQuery = empQuery.eq('location_id', locationId)
    }

    const { data: employees } = await empQuery

    // 6. Aggregate appointment data for the prompt
    const aggregated = aggregateAppointmentData(appointments)

    // 7. Build AI prompt
    const prompt = buildAnalysisPrompt(aggregated, services || [], staffingReqs || [], employees || [], weeksBack, targetWeekStart)

    // 8. Call OpenAI
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.openaiModel || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert veterinary hospital operations analyst. You analyze appointment data to recommend optimal service scheduling, staffing levels, and resource allocation. Your recommendations should be data-driven, practical, and actionable. Always respond with valid JSON matching the requested schema.`
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('OpenAI error', null, 'Appointment Analysis', error)
      await supabase.from('appointment_analysis_runs').update({ status: 'failed' }).eq('id', run.id)
      throw createError({ statusCode: 503, message: 'AI service temporarily unavailable' })
    }

    const completion = await response.json()
    const analysis = JSON.parse(completion.choices[0].message.content)

    // 9. Save results
    const weeksInRange = Math.ceil((Date.now() - new Date(run.analysis_period_start).getTime()) / (7 * 86400000))
    
    await supabase
      .from('appointment_analysis_runs')
      .update({
        status: 'completed',
        demand_summary: analysis.demandSummary || {},
        service_recommendations: analysis.serviceRecommendations || [],
        staffing_suggestions: analysis.staffingSuggestions || [],
        weekly_plan: analysis.weeklyPlan || {},
        insights: analysis.insights || [],
        total_appointments_analyzed: appointments.length,
        date_range_weeks: weeksInRange,
        ai_model: config.openaiModel || 'gpt-4o-mini',
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    return {
      success: true,
      runId: run.id,
      totalAppointments: appointments.length,
      weeksAnalyzed: weeksInRange,
      ...analysis,
    }

  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('Analysis failed', err, 'Appointment Analysis')
    throw createError({ statusCode: 500, message: 'Failed to analyze appointment data' })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────

interface AggregatedData {
  totalAppointments: number
  dateRange: { start: string; end: string }
  byType: Record<string, { count: number; completed: number; cancelled: number; noShows: number; totalRevenue: number }>
  byDayOfWeek: Record<number, { count: number; types: Record<string, number> }>
  byServiceCategory: Record<string, { count: number; byDay: Record<number, number> }>
  bySpecies: Record<string, number>
  weeklyTrend: Record<string, number>
}

function aggregateAppointmentData(appointments: any[]): AggregatedData {
  const byType: Record<string, any> = {}
  const byDayOfWeek: Record<number, any> = {}
  const byServiceCategory: Record<string, any> = {}
  const bySpecies: Record<string, number> = {}
  const weeklyTrend: Record<string, number> = {}

  for (const appt of appointments) {
    const type = appt.appointment_type || 'Unknown'
    const date = new Date(appt.appointment_date)
    const dow = date.getDay()
    const weekKey = getWeekStart(date)
    const category = appt.service_category || 'UNMAPPED'
    const species = appt.species || 'Unknown'

    // Skip Sunday data — all locations are closed on Sundays
    if (dow === 0) continue

    // By type
    // Note: duration_minutes is intentionally excluded — CSV report values are not accurate
    if (!byType[type]) byType[type] = { count: 0, completed: 0, cancelled: 0, noShows: 0, totalRevenue: 0 }
    byType[type].count++
    if (appt.status === 'completed') byType[type].completed++
    if (appt.status === 'cancelled') byType[type].cancelled++
    if (appt.status === 'no_show') byType[type].noShows++
    if (appt.revenue) byType[type].totalRevenue += parseFloat(appt.revenue)

    // By day of week
    if (!byDayOfWeek[dow]) byDayOfWeek[dow] = { count: 0, types: {} }
    byDayOfWeek[dow].count++
    byDayOfWeek[dow].types[type] = (byDayOfWeek[dow].types[type] || 0) + 1

    // By service category
    if (!byServiceCategory[category]) byServiceCategory[category] = { count: 0, byDay: {} }
    byServiceCategory[category].count++
    byServiceCategory[category].byDay[dow] = (byServiceCategory[category].byDay[dow] || 0) + 1

    // By species
    bySpecies[species] = (bySpecies[species] || 0) + 1

    // Weekly trend
    weeklyTrend[weekKey] = (weeklyTrend[weekKey] || 0) + 1
  }

  return {
    totalAppointments: appointments.length,
    dateRange: {
      start: appointments[0]?.appointment_date,
      end: appointments[appointments.length - 1]?.appointment_date,
    },
    byType,
    byDayOfWeek,
    byServiceCategory,
    bySpecies,
    weeklyTrend,
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().split('T')[0]
}

function buildAnalysisPrompt(
  data: AggregatedData,
  services: any[],
  staffingReqs: any[],
  employees: any[],
  weeksBack: number,
  targetWeekStart?: string
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Get GreenDog-specific department/appointment type mappings
  const deptSummary = getServiceDepartmentSummary()

  return `
Analyze the following veterinary hospital appointment data and provide scheduling recommendations.

## IMPORTANT: This is Green Dog Dental & Veterinary Center
This is a multi-location veterinary hospital with 3 locations:
- Sherman Oaks (SO) - Main facility
- Van Nuys (VN) 
- Venice (VE) / DOG PPL

## CRITICAL: All locations are CLOSED on Sundays
Do NOT include Sunday in any recommendations, weekly plans, peak day lists, or staffing suggestions.
The operating days are Monday through Saturday only (day numbers 1-6).
Any Sunday data has already been excluded from the dataset below.

## Service Departments & Appointment Types
The hospital organizes services into these departments, each with specific appointment types:
${deptSummary.map(d => `
### ${d.department} (Code: ${d.serviceCode}) ${d.requiresDVM ? '[Requires DVM]' : '[Tech-level]'}
Appointment types: ${d.appointmentTypes.join(', ')}
`).join('\n')}

Key terminology:
- NAD = Non-Anesthesia Dental (basic dental cleaning, no anesthesia required)
- NEAT = Nails, Ears, Anal Glands, Tech services
- OE = Oral Exam
- AP = Advanced Procedure (under anesthesia - dental surgery, extractions)
- VE = Veterinary Exam (wellness)
- UC = Urgent Care
- IM = Internal Medicine
- EX = Exotics
- MPMV = Mobile Pet Medicine / Venice location services
- "Avail" rows = available appointment slots (capacity, NOT actual appointments)
- SO/VN/VE = Location codes (Sherman Oaks / Van Nuys / Venice)

## Appointment Data Summary (Last ${weeksBack} weeks)
- Total appointments: ${data.totalAppointments}
- Date range: ${data.dateRange.start} to ${data.dateRange.end}

## Appointments by Type
${JSON.stringify(data.byType, null, 2)}

## Appointments by Day of Week (1=Mon through 6=Sat; closed Sundays)
${Object.entries(data.byDayOfWeek)
  .filter(([dow]) => parseInt(dow) !== 0)
  .map(([dow, d]: [string, any]) => 
    `${dayNames[parseInt(dow)]}: ${d.count} appointments`
  ).join('\n')}

## Appointments by Service Category
${JSON.stringify(data.byServiceCategory, null, 2)}

## Weekly Trend
${JSON.stringify(data.weeklyTrend, null, 2)}

## Available Services in Our System
${JSON.stringify(services.map(s => ({ code: s.code, name: s.name, requiresDVM: s.requires_dvm })), null, 2)}

## Current Staffing Requirements per Service
${JSON.stringify(staffingReqs.map(r => ({ 
  serviceId: r.service_id, role: r.role_label, category: r.role_category,
  min: r.min_count, max: r.max_count, required: r.is_required,
  hours: `${r.default_start_time}-${r.default_end_time}`
})), null, 2)}

## Available Staff (${employees.length} employees)
${JSON.stringify(employees.slice(0, 30).map((e: any) => ({
  name: `${e.first_name} ${e.last_name}`,
  skills: e.employee_skills?.map((s: any) => s.skill_library?.name).filter(Boolean) || []
})), null, 2)}
${employees.length > 30 ? `... and ${employees.length - 30} more employees` : ''}

${targetWeekStart ? `## Target Week: ${targetWeekStart}\nGenerate a specific weekly plan for this week.\n` : ''}

## Required Response Format
Use the actual GreenDog service codes (DENTAL, AP, WELLNESS, ADDON, IMAGING, SURG, EXOTIC, IM, CARDIO, MPMV) in your response.
{
  "demandSummary": {
    "SERVICE_CODE": {
      "avgPerWeek": number,
      "trend": "increasing" | "stable" | "decreasing",
      "peakDays": ["Mon", "Wed"],
      "peakLocations": ["SO", "VN"],
      "completionRate": number,
      "notes": "string with GDD-specific insight"
    }
  },
  "serviceRecommendations": [
    {
      "serviceCode": "DENTAL",
      "serviceName": "Dentistry",
      "recommendedDays": [1, 2, 3, 4, 5],
      "dailyVolume": 15,
      "volumeByLocation": { "SO": 8, "VN": 5, "VE": 2 },
      "staffNeeded": { "DVM": 2, "Tech": 3, "DA": 1 },
      "reasoning": "NAD + NEAT + OE combined drive 70-80 dental visits/week across locations",
      "priority": "high" | "medium" | "low"
    }
  ],
  "staffingSuggestions": [
    {
      "serviceCode": "DENTAL",
      "role": "DVM",
      "recommendedCount": 2,
      "currentCapacity": "adequate" | "understaffed" | "overstaffed",
      "notes": "Need DVM coverage for NAD procedures; NEAT can be tech-only"
    }
  ],
  "weeklyPlan": {
    "Mon": { "services": [{ "code": "DENTAL", "slots": 15, "byLocation": { "SO": 8, "VN": 5, "VE": 2 } }], "totalStaff": 12 },
    "Tue": { "services": [...], "totalStaff": 10 },
    // ... Wed through Sat only. Do NOT include Sun.
  },
  "insights": [
    { "type": "trend", "message": "Dental (NAD/NEAT) is the highest-volume department at ~80 appointments/week", "severity": "info" },
    { "type": "opportunity", "message": "Tuesday has low utilization at VN - consider adding AP or IM slots", "severity": "warning" },
    { "type": "staffing", "message": "Exotics only needs coverage Wed (VN) - can consolidate that DVM's other days", "severity": "info" },
    { "type": "capacity", "message": "Dental availability (Avail slots) suggests room for 20% more appointments", "severity": "info" }
  ]
}
`
}
