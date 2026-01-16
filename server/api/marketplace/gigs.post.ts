/**
 * POST /api/marketplace/gigs
 * Create a new gig (admin/hr_admin only)
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

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

  const body = await readBody(event)

  const { data: gig, error } = await client
    .from('marketplace_gigs')
    .insert({
      title: body.title,
      description: body.description,
      bounty_value: body.bounty_value,
      duration_minutes: body.duration_minutes || 60,
      flake_penalty: body.flake_penalty || 0,
      category: body.category,
      difficulty: body.difficulty || 'medium',
      icon: body.icon || 'mdi-star',
      max_claims: body.max_claims || 1,
      is_recurring: body.is_recurring || false,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { gig }
})
