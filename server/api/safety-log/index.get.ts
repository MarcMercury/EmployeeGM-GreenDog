/**
 * GET /api/safety-log
 * List safety logs with optional filters.
 * All authenticated users see their own; managers+ see all.
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const supabase = await serverSupabaseClient(event)

  let dbQuery = supabase
    .from('safety_logs')
    .select('*, submitter:submitted_by(id, first_name, last_name), reviewer:reviewed_by(id, first_name, last_name)', { count: 'exact' })
    .order('submitted_at', { ascending: false })

  // Optional filters
  if (query.log_type) dbQuery = dbQuery.eq('log_type', query.log_type as string)
  if (query.location) dbQuery = dbQuery.eq('location', query.location as string)
  if (query.status) dbQuery = dbQuery.eq('status', query.status as string)
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
