/**
 * POST /api/marketplace/gigs/[id]/claim
 * Claim an open gig
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

  // Get user's employee ID
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const { data: employee } = await client
    .from('employees')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  if (!employee) {
    throw createError({ statusCode: 403, message: 'Employee profile required' })
  }

  // Check gig is open
  const { data: gig, error: gigError } = await client
    .from('marketplace_gigs')
    .select('*')
    .eq('id', gigId)
    .single()

  if (gigError || !gig) {
    throw createError({ statusCode: 404, message: 'Gig not found' })
  }

  if (gig.status !== 'open') {
    throw createError({ statusCode: 400, message: 'Gig is not available for claiming' })
  }

  // Check if user already has a claimed gig (optional: limit concurrent claims)
  const { data: existingClaims } = await client
    .from('marketplace_gigs')
    .select('id')
    .eq('claimed_by', employee.id)
    .eq('status', 'claimed')

  if (existingClaims && existingClaims.length >= 3) {
    throw createError({ statusCode: 400, message: 'You can only have 3 active claims at a time' })
  }

  // Claim the gig
  const { data: updatedGig, error: updateError } = await client
    .from('marketplace_gigs')
    .update({
      status: 'claimed',
      claimed_by: employee.id,
      claimed_at: new Date().toISOString()
    })
    .eq('id', gigId)
    .eq('status', 'open') // Ensure still open (race condition protection)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  if (!updatedGig) {
    throw createError({ statusCode: 409, message: 'Gig was claimed by someone else' })
  }

  return { gig: updatedGig }
})
