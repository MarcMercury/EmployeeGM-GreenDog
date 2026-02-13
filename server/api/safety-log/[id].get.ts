/**
 * GET /api/safety-log/:id
 * Fetch a single safety log by ID.
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Log ID is required' })
  }

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('safety_logs')
    .select('*, submitter:submitted_by(id, first_name, last_name), reviewer:reviewed_by(id, first_name, last_name)')
    .eq('id', id)
    .single()

  if (error) {
    throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, message: error.message })
  }

  return { data }
})
