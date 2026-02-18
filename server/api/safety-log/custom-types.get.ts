/**
 * GET /api/safety-log/custom-types
 * List all custom safety log types.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await (client as any)
    .from('custom_safety_log_types')
    .select('*')
    .eq('is_active', true)
    .order('label')

  if (error) throw createError({ statusCode: 500, message: error.message })

  return data || []
})
