/**
 * GET /api/safety-log/schedules
 * Fetch all schedule rows (types × locations).
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)

  const { data, error } = await (client as any)
    .from('safety_log_schedules')
    .select('*')
    .order('location')
    .order('log_type')

  if (error) {
    console.error('[schedules.get] Supabase error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return data || []
})
