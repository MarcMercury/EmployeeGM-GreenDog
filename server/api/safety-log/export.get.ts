/**
 * GET /api/safety-log/export
 * Export safety logs as CSV. Managers+ only.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
const MAX_EXPORT_ROWS = 10_000

/**
 * Sanitize a cell value to prevent CSV formula injection.
 * Prefixes dangerous leading characters with a single quote.
 */
function sanitizeCsvCell(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) {
    return `'${val}`
  }
  return val
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify manager+ role
  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Export requires manager-level access' })
  }

  const query = getQuery(event)

  let dbQuery = supabase
    .from('safety_logs')
    .select('*, submitter:submitted_by(id, first_name, last_name)')
    .order('submitted_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS)

  if (query.log_type) dbQuery = dbQuery.eq('log_type', query.log_type as string)
  if (query.location) dbQuery = dbQuery.eq('location', query.location as string)
  if (query.date_from) dbQuery = dbQuery.gte('submitted_at', query.date_from as string)
  if (query.date_to) dbQuery = dbQuery.lte('submitted_at', (query.date_to as string) + 'T23:59:59')

  const { data, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Build CSV
  const rows = (data || []).map((log: any) => ({
    id: log.id,
    log_type: log.log_type,
    location: log.location,
    submitted_by: log.submitter
      ? `${log.submitter.first_name} ${log.submitter.last_name}`
      : log.submitted_by,
    submitted_at: log.submitted_at,
    status: log.status,
    osha_recordable: log.osha_recordable ? 'Yes' : 'No',
    form_data: JSON.stringify(log.form_data),
  }))

  const headers = ['id', 'log_type', 'location', 'submitted_by', 'submitted_at', 'status', 'osha_recordable', 'form_data']
  const csvLines = [
    headers.join(','),
    ...rows.map((r: any) =>
      headers.map(h => {
        const val = sanitizeCsvCell(String(r[h] ?? '').replace(/"/g, '""'))
        return `"${val}"`
      }).join(',')
    ),
  ]

  setResponseHeader(event, 'Content-Type', 'text/csv')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="safety-logs-export-${new Date().toISOString().slice(0, 10)}.csv"`)

  return csvLines.join('\n')
})
