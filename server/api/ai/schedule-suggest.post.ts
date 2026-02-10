/**
 * AI Schedule Suggestions API
 * 
 * Uses OpenAI to generate intelligent schedule suggestions based on:
 * - Employee availability and preferences
 * - Required shift coverage
 * - Skill certifications
 * - Fairness constraints (weekend rotation, etc.)
 * 
 * POST /api/ai/schedule-suggest
 */

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

interface ShiftRequirement {
  date: string
  startTime: string
  endTime: string
  role: string
  requiredSkills?: string[]
  minStaff: number
}

interface EmployeeAvailability {
  id: string
  name: string
  skills: string[]
  preferences: {
    preferredDays?: string[]
    avoidDays?: string[]
    maxHoursPerWeek?: number
  }
  recentWeekendShifts: number
}

interface SuggestedShift {
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  role: string
  confidence: number
  reasoning: string
}

interface ScheduleSuggestion {
  shifts: SuggestedShift[]
  coverage: {
    date: string
    filled: number
    required: number
    status: 'full' | 'partial' | 'empty'
  }[]
  warnings: string[]
  summary: string
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const adminClient = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check admin access using service role to bypass RLS
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  // Log for debugging
  logger.debug('User ID', 'AI Schedule', { userId: user.id })
  logger.debug('Profile', 'AI Schedule', { profile })
  logger.debug('Profile Error', 'AI Schedule', { profileError })

  if (profileError) {
    logger.error('Failed to fetch profile', profileError, 'AI Schedule')
    throw createError({ statusCode: 500, message: 'Failed to verify access: ' + profileError.message })
  }

  if (!profile || !['admin', 'super_admin', 'manager', 'hr_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: `Admin access required. Current role: ${profile?.role || 'unknown'}` })
  }

  const body = await readBody(event)
  const { weekStart, departmentId, locationId } = body

  if (!weekStart) {
    throw createError({ statusCode: 400, message: 'weekStart is required' })
  }

  // Get OpenAI API key
  const config = useRuntimeConfig()
  const openaiKey = config.openaiApiKey

  if (!openaiKey) {
    throw createError({ 
      statusCode: 503, 
      message: 'AI service not configured. Please add OPENAI_API_KEY.' 
    })
  }

  try {
    // 1. Gather context data (use adminClient to bypass RLS)
    const employees = await getAvailableEmployees(adminClient, departmentId, locationId)
    const requirements = await getShiftRequirements(adminClient, weekStart, departmentId)
    const recentSchedules = await getRecentScheduleData(adminClient, employees.map(e => e.id))
    const demandData = await getAppointmentDemand(adminClient, locationId)

    // 2. Build the prompt
    const prompt = buildSchedulingPrompt(employees, requirements, recentSchedules, weekStart, demandData)

    // 3. Call OpenAI
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.openaiScheduleModel,
        messages: [
          {
            role: 'system',
            content: `You are an expert veterinary hospital scheduling assistant. You create optimal staff schedules that:
1. Ensure proper coverage for all shifts
2. Match employee certifications to required roles
3. Distribute weekend and holiday shifts fairly
4. Respect employee preferences when possible
5. Avoid scheduling conflicts and burnout (no back-to-back close-open shifts)

Always respond with valid JSON matching the requested schema.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent scheduling
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('OpenAI error', null, 'AI Schedule', error)
      throw createError({ 
        statusCode: 503, 
        message: 'AI service temporarily unavailable' 
      })
    }

    const completion = await response.json()
    const suggestion = JSON.parse(completion.choices[0].message.content) as ScheduleSuggestion

    // 4. Validate and enhance the suggestion
    const validatedSuggestion = validateSuggestion(suggestion, employees, requirements)

    // 5. Log the AI usage for auditing
    await createAuditLog({
      action: 'generate',
      entityType: 'ai_feature',
      entityId: 'schedule_suggest',
      actorProfileId: profile.id,
      metadata: {
        weekStart,
        departmentId,
        shiftsGenerated: validatedSuggestion.shifts.length,
        model: config.openaiScheduleModel
      }
    })

    return validatedSuggestion

  } catch (err: any) {
    logger.error('Error', err, 'AI Schedule')
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to generate schedule suggestions' 
    })
  }
})

// Helper functions

async function getAvailableEmployees(client: any, departmentId?: string, locationId?: string) {
  let query = client
    .from('employees')
    .select(`
      id, first_name, last_name, 
      position_id, department_id, location_id,
      employee_skills (
        skill_id,
        skill_library ( name, category )
      )
    `)
    .eq('is_active', true)
    .eq('employment_status', 'active')

  if (departmentId) {
    query = query.eq('department_id', departmentId)
  }
  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Employee fetch error', error, 'AI Schedule')
    return []
  }

  // Fetch reliability scores for all employees
  const employeeIds = data.map((emp: any) => emp.id)
  const reliabilityScores = await getReliabilityScores(client, employeeIds)

  return data.map((emp: any) => ({
    id: emp.id,
    name: `${emp.first_name} ${emp.last_name}`,
    skills: emp.employee_skills?.map((s: any) => s.skill_library?.name).filter(Boolean) || [],
    reliabilityScore: reliabilityScores[emp.id] ?? 100,
    preferences: {} // Could be enhanced with actual preferences
  }))
}

/**
 * Get reliability scores for employees from attendance data
 */
async function getReliabilityScores(client: any, employeeIds: string[]): Promise<Record<string, number>> {
  const scores: Record<string, number> = {}
  
  // Filter out any undefined/null values and return early if empty
  const validIds = employeeIds.filter(id => id != null && id !== 'undefined')
  if (validIds.length === 0) {
    return scores
  }
  
  const lookbackDays = 90
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

  // Try to get from attendance table
  const { data: attendanceData } = await client
    .from('attendance')
    .select('employee_id, penalty_weight')
    .in('employee_id', validIds)
    .gte('shift_date', cutoffDate.toISOString().split('T')[0])

  if (attendanceData && attendanceData.length > 0) {
    // Group by employee and calculate score
    const groupedByEmployee: Record<string, { total: number; penalty: number }> = {}
    
    for (const record of attendanceData) {
      if (!groupedByEmployee[record.employee_id]) {
        groupedByEmployee[record.employee_id] = { total: 0, penalty: 0 }
      }
      groupedByEmployee[record.employee_id].total++
      groupedByEmployee[record.employee_id].penalty += (record.penalty_weight || 0)
    }
    
    for (const [empId, data] of Object.entries(groupedByEmployee)) {
      if (data.total > 0) {
        scores[empId] = Math.round(100 - (data.penalty / data.total * 100))
      }
    }
  }

  return scores
}

async function getShiftRequirements(client: any, weekStart: string, departmentId?: string) {
  // Fetch actual staffing requirements from the service_staffing_requirements table
  const weekDays = getWeekDays(weekStart)
  
  const { data: staffingReqs, error } = await client
    .from('service_staffing_requirements')
    .select(`
      id, role_category, role_label, is_required, priority,
      default_start_time, default_end_time, min_count,
      service:service_id(id, name, code, is_active)
    `)
    .order('priority')

  if (error || !staffingReqs || staffingReqs.length === 0) {
    logger.warn('No staffing requirements found, using defaults', 'AI Schedule')
    // Fallback to basic defaults if no requirements configured
    return weekDays.filter(date => {
      const dayOfWeek = new Date(date).getDay()
      return dayOfWeek >= 1 && dayOfWeek <= 5 // Mon-Fri only  
    }).flatMap(date => [
      { date, startTime: '07:00', endTime: '17:30', role: 'Veterinary Technician', minStaff: 2 },
      { date, startTime: '07:00', endTime: '17:30', role: 'Receptionist', minStaff: 1 }
    ])
  }

  // Build requirements for each weekday from the staffing configuration
  // Only include active services
  const activeReqs = staffingReqs.filter((r: any) => r.service?.is_active !== false)
  
  return weekDays.filter(date => {
    const dayOfWeek = new Date(date).getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 // Mon-Fri by default
  }).flatMap(date => 
    activeReqs.map((req: any) => ({
      date,
      startTime: req.default_start_time || '09:00',
      endTime: req.default_end_time || '17:30',
      role: req.role_label || req.role_category,
      service: req.service?.name || 'General',
      minStaff: req.min_count || 1,
      isRequired: req.is_required !== false
    }))
  )
}

/**
 * Fetch latest appointment demand analysis to inform scheduling decisions
 */
async function getAppointmentDemand(client: any, locationId?: string) {
  try {
    let query = client
      .from('appointment_analysis_runs')
      .select('demand_summary, service_recommendations, weekly_plan')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data } = await query.single()
    return data || null
  } catch {
    return null
  }
}

async function getRecentScheduleData(client: any, employeeIds: string[]) {
  const weekendCounts: Record<string, number> = {}
  
  // Filter out any undefined/null values and return early if empty
  const validIds = employeeIds.filter(id => id != null && id !== 'undefined')
  if (validIds.length === 0) {
    return { weekendCounts }
  }
  
  // Get recent weekend shifts for fairness
  const { data } = await client
    .from('shifts')
    .select('employee_id, start_at')
    .in('employee_id', validIds)
    .gte('start_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('start_at', { ascending: false })
  
  for (const shift of data || []) {
    const dayOfWeek = new Date(shift.start_at).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCounts[shift.employee_id] = (weekendCounts[shift.employee_id] || 0) + 1
    }
  }

  return { weekendCounts }
}

function buildSchedulingPrompt(
  employees: any[], 
  requirements: ShiftRequirement[], 
  recentData: any,
  weekStart: string,
  demandData?: any
): string {
  // Format employees with reliability info
  const employeeInfo = employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    skills: emp.skills,
    reliabilityScore: emp.reliabilityScore,
    preferences: emp.preferences
  }))

  return `
Generate an optimal schedule for the week starting ${weekStart}.

## Available Employees
${JSON.stringify(employeeInfo, null, 2)}

## Shift Requirements
${JSON.stringify(requirements, null, 2)}

## Recent Weekend Shift Counts (for fairness)
${JSON.stringify(recentData.weekendCounts, null, 2)}

${demandData ? `## Appointment Demand Analysis
The following demand data comes from analyzing historical appointment data. Use it to prioritize services and staffing levels.

### Demand Summary by Service
${JSON.stringify(demandData.demand_summary, null, 2)}

### Service Recommendations
${JSON.stringify(demandData.service_recommendations, null, 2)}

### Recommended Weekly Plan
${JSON.stringify(demandData.weekly_plan, null, 2)}
` : ''}
## Instructions
1. Assign employees to shifts based on their skills
2. Ensure minimum staff requirements are met
3. Distribute weekend shifts fairly (prioritize those with fewer recent weekend shifts)
4. Each employee should work 32-40 hours per week
5. Avoid scheduling the same person for closing (ends after 20:00) then opening (starts before 08:00) the next day
6. RELIABILITY SCORES: Consider reliability scores when assigning shifts. Employees with higher reliability (90+) are more dependable. For critical shifts, prefer employees with higher reliability. Factor reliability into your confidence score.
7. DEMAND DATA: If appointment demand analysis is provided, use it to prioritize services with higher demand, schedule more staff on peak days, and align shift types with service recommendations.

## Required Response Format
{
  "shifts": [
    {
      "employeeId": "uuid",
      "employeeName": "First Last",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "role": "Role Name",
      "confidence": 0.0-1.0,
      "reasoning": "Brief explanation"
    }
  ],
  "coverage": [
    {
      "date": "YYYY-MM-DD",
      "filled": number,
      "required": number,
      "status": "full" | "partial" | "empty"
    }
  ],
  "warnings": ["Any scheduling concerns"],
  "summary": "Brief overview of the generated schedule"
}
`
}

function validateSuggestion(
  suggestion: ScheduleSuggestion, 
  employees: any[], 
  requirements: ShiftRequirement[]
): ScheduleSuggestion {
  const employeeIds = new Set(employees.map(e => e.id))
  
  // Filter out any invalid employee assignments
  suggestion.shifts = suggestion.shifts.filter(shift => 
    employeeIds.has(shift.employeeId)
  )

  // Add any missing warnings
  if (!suggestion.warnings) {
    suggestion.warnings = []
  }

  // Check for understaffing
  const shiftsPerDate: Record<string, number> = {}
  for (const shift of suggestion.shifts) {
    shiftsPerDate[shift.date] = (shiftsPerDate[shift.date] || 0) + 1
  }

  const requiredPerDate: Record<string, number> = {}
  for (const req of requirements) {
    requiredPerDate[req.date] = (requiredPerDate[req.date] || 0) + req.minStaff
  }

  for (const [date, required] of Object.entries(requiredPerDate)) {
    const filled = shiftsPerDate[date] || 0
    if (filled < required) {
      suggestion.warnings.push(`${date}: Only ${filled}/${required} shifts filled`)
    }
  }

  return suggestion
}

// logAIUsage removed — now uses createAuditLog() (auto-imported utility that writes to audit_logs)

function getWeekDays(weekStart: string): string[] {
  const days: string[] = []
  const start = new Date(weekStart)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    days.push(date.toISOString().split('T')[0])
  }
  
  return days
}
