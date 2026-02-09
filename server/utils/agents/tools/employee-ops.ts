/**
 * Employee Operations Tool
 *
 * Reusable read/write utilities for employee-related data.
 * Used by multiple agents to avoid duplicated queries.
 */

/** Get all active employees with key fields */
export async function getActiveEmployees(fields?: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employees')
    .select(fields ?? 'id, first_name, last_name, email, position_id, department_id, location_id, profile_id, manager_employee_id, employment_status, hire_date')
    .eq('employment_status', 'active')
    .order('last_name')

  return data ?? []
}

/** Get a single employee by ID */
export async function getEmployee(employeeId: string): Promise<any | null> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  return data
}

/** Get employees by location/department */
export async function getEmployeesByLocation(locationId: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employees')
    .select('id, first_name, last_name, position_id, profile_id')
    .eq('location_id', locationId)
    .eq('employment_status', 'active')
    .order('last_name')

  return data ?? []
}

export async function getEmployeesByDepartment(departmentId: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employees')
    .select('id, first_name, last_name, position_id, profile_id')
    .eq('department_id', departmentId)
    .eq('employment_status', 'active')
    .order('last_name')

  return data ?? []
}

/** Get all locations */
export async function getLocations(): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('locations')
    .select('id, name, address, city, state, zip')
    .eq('is_active', true)
    .order('name')

  return data ?? []
}

/** Get all departments */
export async function getDepartments(): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('departments')
    .select('id, name')
    .order('name')

  return data ?? []
}

/** Get all job positions */
export async function getPositions(): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('job_positions')
    .select('id, title, department_id, is_active')
    .eq('is_active', true)
    .order('title')

  return data ?? []
}

/** Get an employee's attendance records for a date range */
export async function getAttendance(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('attendance')
    .select('id, shift_date, status, clock_in, clock_out, notes')
    .eq('employee_id', employeeId)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: false })

  return data ?? []
}

/** Get an employee's time entries for a date range */
export async function getTimeEntries(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('time_entries')
    .select('id, clock_in, clock_out, total_hours, status, overtime_hours, is_approved')
    .eq('employee_id', employeeId)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate)
    .order('clock_in', { ascending: false })

  return data ?? []
}

/** Get an employee's goals */
export async function getEmployeeGoals(employeeId: string, activeOnly = true): Promise<any[]> {
  const client = createAdminClient() as any
  let query = client
    .from('employee_goals')
    .select('id, title, description, category, progress, target_date, completed')
    .eq('employee_id', employeeId)
    .order('target_date')

  if (activeOnly) query = query.eq('completed', false)

  const { data } = await query
  return data ?? []
}

/** Get the profile ID for an employee */
export async function getProfileId(employeeId: string): Promise<string | null> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employees')
    .select('profile_id')
    .eq('id', employeeId)
    .single()

  return data?.profile_id ?? null
}

/** Get manager info for an employee */
export async function getManager(employeeId: string): Promise<any | null> {
  const client = createAdminClient() as any

  const { data: emp } = await client
    .from('employees')
    .select('manager_employee_id')
    .eq('id', employeeId)
    .single()

  if (!emp?.manager_employee_id) return null

  const { data: manager } = await client
    .from('employees')
    .select('id, first_name, last_name, profile_id, email')
    .eq('id', emp.manager_employee_id)
    .single()

  return manager
}
