/**
 * Agent B2: Schedule Planner
 *
 * Auto-generates draft weekly schedules using LLM + existing scheduling data.
 * Builds on the existing AI scheduling infrastructure (shifts, services, availability).
 *
 * Reads: shifts, employees, employee_availability, schedule_weeks, services,
 *        service_slots, service_staffing_requirements, scheduling_rules, locations
 * Writes: agent_proposals (schedule_draft type)
 * LLM: gpt-4o for complex multi-constraint scheduling
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'
import { getServiceDepartmentSummary } from '../../utils/appointments/clinic-report-parser'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting schedule planning`, 'agent', { runId })

  // 1. Determine the target week (next Monday)
  const now = new Date()
  const daysUntilMonday = ((8 - now.getDay()) % 7) || 7
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  const weekStart = nextMonday.toISOString().split('T')[0]

  // 2. Get all active locations
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('id, name, code, timezone')
    .eq('is_active', true)

  if (locErr || !locations || locations.length === 0) {
    throw new Error(`Failed to fetch locations: ${locErr?.message ?? 'No active locations'}`)
  }

  // Process one location per run (rotate)
  const lastLocIdx = (config.lastLocationIndex as number) ?? -1
  const locIdx = (lastLocIdx + 1) % locations.length
  const location = locations[locIdx]

  logger.info(`[Agent:${agentId}] Planning schedule for ${location.name}, week of ${weekStart}`, 'agent')

  // 3. Check if a draft already exists for this week/location
  const { data: existingWeek } = await supabase
    .from('schedule_weeks')
    .select('id, status')
    .eq('location_id', location.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existingWeek && ['published', 'locked'].includes(existingWeek.status)) {
    logger.info(`[Agent:${agentId}] Schedule already ${existingWeek.status} for ${location.name} week ${weekStart}`, 'agent')
    // Rotate to next location anyway
    await supabase
      .from('agent_registry')
      .update({ config: { ...config, lastLocationIndex: locIdx } })
      .eq('agent_id', agentId)

    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: `Schedule already ${existingWeek.status} for ${location.name}. Skipping.`,
    }
  }

  // 4. Gather employee data for this location
  const { data: empLocations } = await supabase
    .from('employee_locations')
    .select('employee_id')
    .eq('location_id', location.id)

  const employeeIds = (empLocations ?? []).map((el: any) => el.employee_id)

  if (employeeIds.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: `No employees assigned to ${location.name}. Skipping.`,
    }
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, position_id, employment_type')
    .in('id', employeeIds)
    .eq('employment_status', 'active')

  // 5. Get employee availability
  const { data: availability } = await supabase
    .from('employee_availability')
    .select('employee_id, day_of_week, start_time, end_time, availability_type, preference_level')
    .in('employee_id', employeeIds)

  // 6. Get shift templates for this location
  const { data: templates } = await supabase
    .from('shift_templates')
    .select('id, name, weekday, start_time, end_time, role_name, department_id')
    .eq('location_id', location.id)

  // 7. Get service slots
  const { data: serviceSlots } = await supabase
    .from('service_slots')
    .select('id, service_id, day_of_week, start_time, end_time, capacity')
    .eq('location_id', location.id)

  // 8. Get scheduling rules
  const { data: rules } = await supabase
    .from('scheduling_rules')
    .select('name, rule_type, parameters, severity')
    .or(`location_id.eq.${location.id},location_id.is.null`)

  // 9. Get time-off / leave requests for the week
  const weekEnd = new Date(nextMonday)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('employee_id, start_at, end_at, status')
    .eq('location_id', location.id)
    .gte('start_at', weekStart)
    .lte('start_at', weekEndStr)

  // 9b. Fetch latest appointment demand analysis
  let demandContext = ''
  try {
    const { data: latestAnalysis } = await supabase
      .from('appointment_analysis_runs')
      .select('demand_summary, service_recommendations, weekly_plan')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestAnalysis) {
      demandContext = `
APPOINTMENT DEMAND DATA (from recent analysis):
Service demand summary: ${JSON.stringify(latestAnalysis.demand_summary)}
Service recommendations: ${JSON.stringify(latestAnalysis.service_recommendations)}
Weekly plan template: ${JSON.stringify(latestAnalysis.weekly_plan)}
Use this demand data to prioritize which services need more staff coverage on which days.`
    }
  } catch {
    // Demand data is optional — continue without it
  }

  // 9c. Get service department context
  const deptSummary = getServiceDepartmentSummary()

  // 10. Build prompt for LLM
  const employeeList = (employees ?? []).map((e: any) => {
    const empAvail = (availability ?? []).filter((a: any) => a.employee_id === e.id)
    const availStr = empAvail.map((a: any) =>
      `Day ${a.day_of_week}: ${a.start_time}-${a.end_time} (${a.availability_type})`
    ).join('; ')
    return `- ${e.first_name} ${e.last_name} [${e.id.substring(0, 8)}] (${e.employment_type}) Avail: ${availStr || 'No availability set'}`
  }).join('\n')

  const templateList = (templates ?? []).map((t: any) =>
    `- ${t.name}: Day ${t.weekday} ${t.start_time}-${t.end_time} (${t.role_name})`
  ).join('\n')

  const rulesList = (rules ?? []).map((r: any) =>
    `- [${r.severity}] ${r.name}: ${JSON.stringify(r.parameters)}`
  ).join('\n')

  const systemPrompt = `You are an expert veterinary practice scheduler for Green Dog Dental & Veterinary Center. Generate a weekly shift schedule for "${location.name}" for the week starting ${weekStart}.

SERVICE DEPARTMENTS:
${deptSummary.map(d => `- ${d.department} (${d.serviceCode}): ${d.appointmentTypes.slice(0, 5).join(', ')} ${d.requiresDVM ? '[Requires DVM]' : '[Tech-level]'}`).join('\n')}

Key: NAD=Non-Anesthesia Dental, NEAT=Nails/Ears/Anal Glands, OE=Oral Exam, AP=Advanced Procedure, VE=Vet Exam, UC=Urgent Care, IM=Internal Medicine, EX=Exotics
${demandContext}

EMPLOYEES:
${employeeList}

SHIFT TEMPLATES:
${templateList || 'No templates configured — use standard 8-hour shifts'}

SCHEDULING RULES:
${rulesList || 'Standard rules: max 40h/week, min 8h rest between shifts, no double-booking'}

Constraints:
- Respect employee availability
- Distribute hours fairly
- Ensure adequate coverage every day (at least 2 staff per open day)
- Minimize overtime (flag any >40h/week)
- Full-time employees: 32-40h, Part-time: 16-24h

Respond in JSON format:
{
  "schedule": [
    {
      "employee_id": "uuid-prefix",
      "employee_name": "Name",
      "day_of_week": 1,
      "start_time": "08:00",
      "end_time": "16:00",
      "role": "CSR"
    }
  ],
  "warnings": ["Any scheduling conflicts or concerns"],
  "coverage_summary": {
    "monday": { "staff_count": 4, "total_hours": 32 },
    ...
  },
  "total_hours_by_employee": { "Name": 40 }
}`

  const chatResult = await agentChat({
    agentId,
    runId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the optimal schedule for ${location.name}, week of ${weekStart}. We have ${(employees ?? []).length} employees available.` },
    ],
    model: 'reasoning',
    responseFormat: 'json',
    maxTokens: 4000,
    temperature: 0.3,
  })

  // 11. Parse response
  let scheduleData: any = {}
  try {
    scheduleData = JSON.parse(chatResult.content)
  } catch {
    throw new Error(`Failed to parse schedule JSON: ${chatResult.content.substring(0, 200)}`)
  }

  const shiftCount = scheduleData.schedule?.length ?? 0

  // 12. Create proposal
  let proposalsCreated = 0
  if (shiftCount > 0) {
    const proposalId = await createProposal({
      agentId,
      proposalType: 'schedule_draft',
      title: `Draft Schedule: ${location.name} — Week of ${weekStart}`,
      summary: `${shiftCount} shifts for ${(employees ?? []).length} employees. ${scheduleData.warnings?.length ?? 0} warnings.`,
      detail: {
        location_id: location.id,
        location_name: location.name,
        week_start: weekStart,
        shifts: scheduleData.schedule,
        warnings: scheduleData.warnings ?? [],
        coverage_summary: scheduleData.coverage_summary ?? {},
        total_hours_by_employee: scheduleData.total_hours_by_employee ?? {},
      },
      targetEntityType: 'schedule_weeks',
      riskLevel: 'high', // Schedules always need human review
      expiresInHours: 120, // 5 days before the schedule week
    })

    if (proposalId) proposalsCreated = 1
  }

  // 13. Update rotation index
  await supabase
    .from('agent_registry')
    .update({ config: { ...config, lastLocationIndex: locIdx } })
    .eq('agent_id', agentId)

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved: 0,
    tokensUsed: chatResult.tokensUsed,
    costUsd: chatResult.costUsd,
    summary: `Generated ${shiftCount}-shift draft for ${location.name}, week of ${weekStart}. ${scheduleData.warnings?.length ?? 0} warnings.`,
    metadata: {
      location: location.name,
      weekStart,
      shiftCount,
      employeeCount: (employees ?? []).length,
      warnings: scheduleData.warnings?.length ?? 0,
    },
  }
}

export default handler
