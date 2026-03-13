/**
 * POST /api/safety-log/link-employee
 *
 * Link one or more employees to an existing safety log.
 * Accepts: { safety_log_id, employee_ids: [{ id, role }] }
 * Only managers+ can link employees to logs.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']
const VALID_ROLES = ['subject', 'attendee', 'reporter', 'reviewer', 'witness']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const authUserId = getUserId(user)
  const supabase = await serverSupabaseServiceRole(event)

  // Verify caller is a manager+
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Only managers can link employees to logs' })
  }

  const body = await readBody(event)
  const { safety_log_id, employee_ids } = body

  if (!safety_log_id || typeof safety_log_id !== 'string') {
    throw createError({ statusCode: 400, message: 'safety_log_id is required' })
  }

  if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
    throw createError({ statusCode: 400, message: 'employee_ids array is required' })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Validate UUID format
  if (!uuidRegex.test(safety_log_id)) {
    throw createError({ statusCode: 400, message: 'Invalid safety_log_id format' })
  }

  // Verify the safety log exists
  const { data: logExists } = await supabase
    .from('safety_logs')
    .select('id')
    .eq('id', safety_log_id)
    .single()

  if (!logExists) {
    throw createError({ statusCode: 404, message: 'Safety log not found' })
  }

  // Build valid links
  const links = employee_ids
    .map((entry: any) => {
      const empId = typeof entry === 'string' ? entry : entry?.id
      const role = typeof entry === 'object' && VALID_ROLES.includes(entry?.role) ? entry.role : 'subject'

      if (!empId || !uuidRegex.test(empId)) return null
      return { safety_log_id, employee_id: empId, role }
    })
    .filter(Boolean)

  if (links.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid employee links provided' })
  }

  // Upsert to handle duplicates gracefully
  const validLinks = links as { safety_log_id: string; employee_id: string; role: string }[]
  const { data, error } = await supabase
    .from('safety_log_employees')
    .upsert(validLinks, { onConflict: 'safety_log_id,employee_id,role' })
    .select()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data, linked: links.length }
})
