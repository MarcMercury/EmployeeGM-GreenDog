/**
 * PATCH /api/marketplace/gigs/[id]
 * Update a gig (admin only)
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const client = await serverSupabaseServiceRole(event)
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

  const body = await validateBody(event, gigUpdateSchema.extend({
    status: z.enum(['open', 'closed', 'expired']).optional(),
  }))

  // Build update object from validated fields (omit undefined)
  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) updates[key] = value
  }

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
