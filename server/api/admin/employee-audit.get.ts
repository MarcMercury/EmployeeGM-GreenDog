/**
 * GET /api/admin/employee-audit
 * 
 * Audits all active employees for data completeness:
 * - Department assignment
 * - Position assignment
 * - Primary location assignment
 * - Reports-to (manager) assignment
 * 
 * Returns summary stats and a list of employees with gaps.
 * Only admins can access this endpoint.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized - No token provided' })
  }

  const token = authHeader.substring(7)
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  // Verify caller
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || '')
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  if (authError || !callerUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized - Invalid token' })
  }

  // Verify admin role
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single()

  if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden - Admin access required' })
  }

  // Fetch all active employees with their relationships
  const { data: employees, error: empError } = await supabaseAdmin
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      preferred_name,
      email_work,
      employee_number,
      employment_status,
      employment_type,
      hire_date,
      department_id,
      position_id,
      location_id,
      manager_employee_id,
      profile_id,
      department:departments(id, name),
      position:job_positions(id, title),
      location:locations(id, name),
      manager:employees!employees_manager_employee_id_fkey(id, first_name, last_name),
      profile:profiles!employees_profile_id_fkey(id, email, role, is_active)
    `)
    .eq('employment_status', 'active')
    .order('last_name')

  if (empError) {
    throw createError({ statusCode: 500, message: `Failed to fetch employees: ${empError.message}` })
  }

  // Analyze each employee for gaps
  const auditResults = (employees || []).map((emp: any) => {
    const gaps: string[] = []
    if (!emp.department_id) gaps.push('department')
    if (!emp.position_id) gaps.push('position')
    if (!emp.location_id) gaps.push('location')
    if (!emp.manager_employee_id) gaps.push('reports_to')
    if (!emp.profile_id) gaps.push('no_profile')

    return {
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      preferred_name: emp.preferred_name,
      full_name: `${emp.first_name} ${emp.last_name}`,
      email: emp.profile?.email || emp.email_work || '',
      employee_number: emp.employee_number,
      employment_type: emp.employment_type,
      hire_date: emp.hire_date,
      profile_id: emp.profile_id,
      profile_role: emp.profile?.role || null,
      profile_active: emp.profile?.is_active ?? null,
      department_id: emp.department_id,
      department_name: emp.department?.name || null,
      position_id: emp.position_id,
      position_title: emp.position?.title || null,
      location_id: emp.location_id,
      location_name: emp.location?.name || null,
      manager_employee_id: emp.manager_employee_id,
      manager_name: emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : null,
      gaps,
      gap_count: gaps.length,
      is_complete: gaps.length === 0
    }
  })

  // Summary stats
  const total = auditResults.length
  const complete = auditResults.filter((e: any) => e.is_complete).length
  const missingDepartment = auditResults.filter((e: any) => e.gaps.includes('department')).length
  const missingPosition = auditResults.filter((e: any) => e.gaps.includes('position')).length
  const missingLocation = auditResults.filter((e: any) => e.gaps.includes('location')).length
  const missingManager = auditResults.filter((e: any) => e.gaps.includes('reports_to')).length
  const missingProfile = auditResults.filter((e: any) => e.gaps.includes('no_profile')).length

  return {
    summary: {
      total,
      complete,
      incomplete: total - complete,
      completeness_pct: total > 0 ? Math.round((complete / total) * 100) : 0,
      missing_department: missingDepartment,
      missing_position: missingPosition,
      missing_location: missingLocation,
      missing_manager: missingManager,
      missing_profile: missingProfile
    },
    employees: auditResults
  }
})
