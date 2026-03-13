/**
 * GET /api/safety-log/by-employee/[id]
 *
 * Fetch all safety logs linked to a specific employee via the
 * safety_log_employees junction table. Managers+ can view any
 * employee; regular users can only view their own.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const authUserId = getUserId(user)
  const employeeId = getRouterParam(event, 'id')

  if (!employeeId) {
    throw createError({ statusCode: 400, message: 'Employee ID is required' })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(employeeId)) {
    throw createError({ statusCode: 400, message: 'Invalid employee ID format' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Resolve caller's profile and role
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (!callerProfile) {
    throw createError({ statusCode: 403, message: 'Profile not found' })
  }

  const isManager = MANAGER_ROLES.includes(callerProfile.role)

  // Non-managers can only view their own employee's logs
  if (!isManager) {
    const { data: ownEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', callerProfile.id)
      .single()

    if (!ownEmployee || ownEmployee.id !== employeeId) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }
  }

  // Fetch linked safety logs via the junction table
  const { data: links, error: linkError } = await supabase
    .from('safety_log_employees')
    .select('safety_log_id, role')
    .eq('employee_id', employeeId)

  if (linkError) {
    throw createError({ statusCode: 500, message: linkError.message })
  }

  if (!links || links.length === 0) {
    return { data: [], total: 0 }
  }

  const logIds = [...new Set(links.map(l => l.safety_log_id))]
  const roleMap = new Map<string, string[]>()
  for (const link of links) {
    const roles = roleMap.get(link.safety_log_id) || []
    roles.push(link.role)
    roleMap.set(link.safety_log_id, roles)
  }

  // Fetch the actual safety logs
  const { data: logs, error: logError } = await supabase
    .from('safety_logs')
    .select('*')
    .in('id', logIds)
    .order('submitted_at', { ascending: false })

  if (logError) {
    throw createError({ statusCode: 500, message: logError.message })
  }

  // Hydrate submitter/reviewer profile names
  if (logs && logs.length > 0) {
    const profileIds = new Set<string>()
    for (const row of logs) {
      if (row.submitted_by) profileIds.add(row.submitted_by)
      if (row.reviewed_by) profileIds.add(row.reviewed_by)
    }

    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(profileIds))

      const profileMap = new Map<string, { id: string; first_name: string | null; last_name: string | null }>()
      if (profiles) {
        for (const p of profiles) profileMap.set(p.id, p)
      }

      for (const row of logs) {
        ;(row as any).submitter = profileMap.get(row.submitted_by) || null
        ;(row as any).reviewer = row.reviewed_by ? profileMap.get(row.reviewed_by) || null : null
        ;(row as any).employee_roles = roleMap.get(row.id) || []
      }
    }
  }

  return { data: logs || [], total: logs?.length || 0 }
})
