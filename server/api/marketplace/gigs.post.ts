/**
 * POST /api/marketplace/gigs
 * Create a new gig (admin/hr_admin only)
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

  if (!profile || !hasRole(profile.role, MARKETPLACE_ADMIN_ROLES)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await validateBody(event, gigCreateSchema)

  const { data: gig, error } = await client
    .from('marketplace_gigs')
    .insert({
      title: body.title,
      description: body.description,
      bounty_value: body.bounty_value,
      duration_minutes: body.duration_minutes,
      flake_penalty: body.flake_penalty,
      category: body.category,
      difficulty: body.difficulty,
      icon: body.icon,
      max_claims: body.max_claims,
      is_recurring: body.is_recurring,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { gig }
})
