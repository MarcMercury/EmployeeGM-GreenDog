/**
 * PATCH /api/marketplace/rewards/[id]
 * Update a reward (admin only)
 */
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data: { user } } = await supabase.auth.getUser()
  const client = await serverSupabaseServiceRole(event)
  const rewardId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!rewardId) {
    throw createError({ statusCode: 400, message: 'Reward ID required' })
  }

  // Check admin access
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'hr_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await validateBody(event, rewardUpdateSchema.extend({
    image_url: z.string().url().optional().nullable(),
    fulfillment_notes: z.string().max(5000).optional().nullable(),
  }))

  // Build update object from validated fields (omit undefined)
  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) updates[key] = value
  }

  const { data: reward, error } = await client
    .from('marketplace_rewards')
    .update(updates)
    .eq('id', rewardId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { reward }
})
