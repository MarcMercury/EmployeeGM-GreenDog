/**
 * PATCH /api/marketplace/gigs/[id]
 * Update a gig (admin only)
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  const gigId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!gigId) {
    throw createError({ statusCode: 400, message: 'Gig ID required' })
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
  if (body.bounty_value !== undefined) updates.bounty_value = body.bounty_value
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes
  if (body.flake_penalty !== undefined) updates.flake_penalty = body.flake_penalty
  if (body.category !== undefined) updates.category = body.category
  if (body.difficulty !== undefined) updates.difficulty = body.difficulty
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.max_claims !== undefined) updates.max_claims = body.max_claims
  if (body.is_recurring !== undefined) updates.is_recurring = body.is_recurring
  if (body.status !== undefined) updates.status = body.status

  const { data: gig, error } = await client
    .from('marketplace_gigs')
    .update(updates)
    .eq('id', gigId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { gig }
})
