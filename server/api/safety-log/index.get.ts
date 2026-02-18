/**
 * GET /api/safety-log
 * List safety logs with optional filters.
 * Regular users see only their own logs; managers+ see all.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
const VALID_STATUSES = ['draft', 'submitted', 'reviewed', 'flagged']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const supabase = await serverSupabaseServiceRole(event)

  // Resolve the caller's profile and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    throw createError({ statusCode: 403, message: 'Profile not found' })
  }

  const isManager = MANAGER_ROLES.includes(profile.role)

  let dbQuery = supabase
    .from('safety_logs')
    .select('*, submitter:submitted_by(id, first_name, last_name), reviewer:reviewed_by(id, first_name, last_name)', { count: 'exact' })
    .order('submitted_at', { ascending: false })

  // Row-level scoping: non-managers only see their own logs
  if (!isManager) {
    dbQuery = dbQuery.eq('submitted_by', profile.id)
  }

  // Optional filters
  if (query.log_type) dbQuery = dbQuery.eq('log_type', query.log_type as string)
  if (query.location) dbQuery = dbQuery.eq('location', query.location as string)
  if (query.status) {
    const status = query.status as string
    if (!VALID_STATUSES.includes(status)) {
      throw createError({ statusCode: 400, message: `Invalid status filter. Allowed: ${VALID_STATUSES.join(', ')}` })
    }
    dbQuery = dbQuery.eq('status', status)
  }
  if (query.osha_recordable === 'true') dbQuery = dbQuery.eq('osha_recordable', true)
  if (query.date_from) dbQuery = dbQuery.gte('submitted_at', query.date_from as string)
  if (query.date_to) dbQuery = dbQuery.lte('submitted_at', (query.date_to as string) + 'T23:59:59')

  // Pagination
  const page = parseInt(query.page as string) || 1
  const pageSize = Math.min(parseInt(query.pageSize as string) || 25, 100)
  const from = (page - 1) * pageSize
  dbQuery = dbQuery.range(from, from + pageSize - 1)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data, total: count, page, pageSize }
})
