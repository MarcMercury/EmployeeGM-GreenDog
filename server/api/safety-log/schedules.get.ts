/**
 * GET /api/safety-log/schedules
 * Fetch all 36 schedule rows (12 types × 3 locations).
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('safety_log_schedules')
    .select('*')
    .order('location')
    .order('log_type')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return data
})
