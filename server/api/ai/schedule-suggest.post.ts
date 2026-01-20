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

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

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
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check admin access
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'hr_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { weekStart, departmentId, locationId } = body

  if (!weekStart) {
    throw createError({ statusCode: 400, message: 'weekStart is required' })
  }

  // Get OpenAI API key
  const config = useRuntimeConfig()
  const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY

  if (!openaiKey) {
    throw createError({ 
      statusCode: 503, 
      message: 'AI service not configured. Please add OPENAI_API_KEY.' 
    })
  }

  try {
    // 1. Gather context data
    const employees = await getAvailableEmployees(client, departmentId, locationId)
    const requirements = await getShiftRequirements(client, weekStart, departmentId)
    const recentSchedules = await getRecentScheduleData(client, employees.map(e => e.id))

    // 2. Build the prompt
    const prompt = buildSchedulingPrompt(employees, requirements, recentSchedules, weekStart)

    // 3. Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
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
      console.error('[AI Schedule] OpenAI error:', error)
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
    await logAIUsage(client, {
      userId: user.id,
      feature: 'schedule_suggest',
      weekStart,
      departmentId,
      shiftsGenerated: validatedSuggestion.shifts.length,
      model: 'gpt-4-turbo-preview'
    })

    return validatedSuggestion

  } catch (err: any) {
    console.error('[AI Schedule] Error:', err)
    
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
    console.error('[AI Schedule] Employee fetch error:', error)
    return []
  }

  return data.map((emp: any) => ({
    id: emp.id,
    name: `${emp.first_name} ${emp.last_name}`,
    skills: emp.employee_skills?.map((s: any) => s.skill_library?.name).filter(Boolean) || [],
    preferences: {} // Could be enhanced with actual preferences
  }))
}

async function getShiftRequirements(client: any, weekStart: string, departmentId?: string) {
  // In a real implementation, this would fetch from a shift_templates or requirements table
  // For now, return a default pattern
  const weekDays = getWeekDays(weekStart)
  
  return weekDays.flatMap(date => [
    { date, startTime: '07:00', endTime: '15:00', role: 'Veterinary Technician', minStaff: 2 },
    { date, startTime: '07:00', endTime: '15:00', role: 'Dental Technician', minStaff: 1 },
    { date, startTime: '14:00', endTime: '22:00', role: 'Veterinary Technician', minStaff: 2 },
    { date, startTime: '14:00', endTime: '22:00', role: 'Receptionist', minStaff: 1 }
  ])
}

async function getRecentScheduleData(client: any, employeeIds: string[]) {
  // Get recent weekend shifts for fairness
  const { data } = await client
    .from('shifts')
    .select('employee_id, shift_date')
    .in('employee_id', employeeIds)
    .gte('shift_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('shift_date', { ascending: false })

  const weekendCounts: Record<string, number> = {}
  
  for (const shift of data || []) {
    const dayOfWeek = new Date(shift.shift_date).getDay()
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
  weekStart: string
): string {
  return `
Generate an optimal schedule for the week starting ${weekStart}.

## Available Employees
${JSON.stringify(employees, null, 2)}

## Shift Requirements
${JSON.stringify(requirements, null, 2)}

## Recent Weekend Shift Counts (for fairness)
${JSON.stringify(recentData.weekendCounts, null, 2)}

## Instructions
1. Assign employees to shifts based on their skills
2. Ensure minimum staff requirements are met
3. Distribute weekend shifts fairly (prioritize those with fewer recent weekend shifts)
4. Each employee should work 32-40 hours per week
5. Avoid scheduling the same person for closing (ends after 20:00) then opening (starts before 08:00) the next day

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

async function logAIUsage(client: any, data: any) {
  try {
    await client.from('audit_log').insert({
      actor_id: data.userId,
      entity_type: 'ai_feature',
      entity_name: data.feature,
      action: 'generate',
      action_category: 'ai',
      new_values: {
        weekStart: data.weekStart,
        departmentId: data.departmentId,
        shiftsGenerated: data.shiftsGenerated,
        model: data.model
      }
    })
  } catch (err) {
    console.error('[AI Schedule] Audit log error:', err)
    // Don't fail the request if audit logging fails
  }
}

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
