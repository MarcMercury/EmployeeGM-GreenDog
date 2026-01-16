/**
 * PATCH /api/marketplace/rewards/[id]
 * Update a reward (admin only)
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
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

  const body = await readBody(event)

  const updates: Record<string, any> = {}
  
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.cost !== undefined) updates.cost = body.cost
  if (body.stock_quantity !== undefined) updates.stock_quantity = body.stock_quantity
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.image_url !== undefined) updates.image_url = body.image_url
  if (body.category !== undefined) updates.category = body.category
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.requires_approval !== undefined) updates.requires_approval = body.requires_approval
  if (body.fulfillment_notes !== undefined) updates.fulfillment_notes = body.fulfillment_notes

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
