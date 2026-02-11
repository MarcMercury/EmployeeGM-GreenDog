/**
 * POST /api/marketplace/rewards
 * Create a new reward (admin only)
 */
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data: { user } } = await supabase.auth.getUser()
  const client = await serverSupabaseServiceRole(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
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

  const body = await validateBody(event, rewardCreateSchema)

  const { data: reward, error } = await client
    .from('marketplace_rewards')
    .insert({
      title: body.title,
      description: body.description,
      cost: body.cost,
      stock_quantity: body.stock_quantity,
      icon: body.icon || 'mdi-gift',
      category: body.category,
      requires_approval: body.requires_approval,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { reward }
})
