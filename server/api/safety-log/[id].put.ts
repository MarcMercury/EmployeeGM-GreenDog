/**
 * PUT /api/safety-log/:id
 * Update a safety log (review, flag, edit).
 * Managers+ can update any log; users can only update their own drafts.
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { SafetyLogUpdateSchema } from '~/app/schemas/safety-log'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Log ID is required' })
  }

  const body = await readBody(event)
  const parsed = SafetyLogUpdateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('safety_logs')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
