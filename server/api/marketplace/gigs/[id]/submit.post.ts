/**
 * POST /api/marketplace/gigs/[id]/submit
 * Submit proof for a claimed gig
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

  const body = await readBody(event)

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

  // Check gig is claimed by this user
  const { data: gig, error: gigError } = await client
    .from('marketplace_gigs')
    .select('*')
    .eq('id', gigId)
    .single()

  if (gigError || !gig) {
    throw createError({ statusCode: 404, message: 'Gig not found' })
  }

  if (gig.claimed_by !== employee.id) {
    throw createError({ statusCode: 403, message: 'You did not claim this gig' })
  }

  if (gig.status !== 'claimed') {
    throw createError({ statusCode: 400, message: 'Gig is not in claimed status' })
  }

  // Check if deadline has passed
  const deadline = new Date(gig.claimed_at)
  deadline.setMinutes(deadline.getMinutes() + gig.duration_minutes)
  
  if (new Date() > deadline) {
    throw createError({ statusCode: 400, message: 'Deadline has passed. This gig has expired.' })
  }

  // Submit for review
  const { data: updatedGig, error: updateError } = await client
    .from('marketplace_gigs')
    .update({
      status: 'reviewing',
      proof_url: body.proof_url || null,
      proof_notes: body.proof_notes || null
    })
    .eq('id', gigId)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return { gig: updatedGig }
})
