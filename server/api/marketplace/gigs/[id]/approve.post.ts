/**
 * POST /api/marketplace/gigs/[id]/approve
 * Approve a submitted gig and award points (admin only)
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
  const approved = body.approved !== false

  // Get gig
  const { data: gig, error: gigError } = await client
    .from('marketplace_gigs')
    .select('*')
    .eq('id', gigId)
    .single()

  if (gigError || !gig) {
    throw createError({ statusCode: 404, message: 'Gig not found' })
  }

  if (gig.status !== 'reviewing') {
    throw createError({ statusCode: 400, message: 'Gig is not in review status' })
  }

  if (!gig.claimed_by) {
    throw createError({ statusCode: 400, message: 'Gig has no claimant' })
  }

  if (approved) {
    // Get employee's wallet
    const { data: wallet, error: walletError } = await client
      .from('employee_wallets')
      .select('*')
      .eq('employee_id', gig.claimed_by)
      .single()

    if (walletError || !wallet) {
      throw createError({ statusCode: 500, message: 'Wallet not found' })
    }

    const newBalance = wallet.current_balance + gig.bounty_value

    // Update wallet (transactional)
    const { error: walletUpdateError } = await client
      .from('employee_wallets')
      .update({
        current_balance: newBalance,
        lifetime_earned: wallet.lifetime_earned + gig.bounty_value
      })
      .eq('id', wallet.id)

    if (walletUpdateError) {
      throw createError({ statusCode: 500, message: 'Failed to update wallet' })
    }

    // Create transaction record
    const { error: txError } = await client
      .from('marketplace_transactions')
      .insert({
        employee_id: gig.claimed_by,
        transaction_type: 'gig_completed',
        amount: gig.bounty_value,
        balance_after: newBalance,
        gig_id: gig.id,
        description: `Completed: ${gig.title}`,
        created_by: profile.id
      })

    if (txError) {
      console.error('Transaction log error:', txError)
    }

    // Mark gig as completed
    const { data: updatedGig, error: updateError } = await client
      .from('marketplace_gigs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
        times_completed: gig.times_completed + 1
      })
      .eq('id', gigId)
      .select()
      .single()

    if (updateError) {
      throw createError({ statusCode: 500, message: updateError.message })
    }

    // If recurring and not at max claims, create a new open gig
    if (gig.is_recurring && (gig.times_completed + 1) < gig.max_claims) {
      await client
        .from('marketplace_gigs')
        .update({
          status: 'open',
          claimed_by: null,
          claimed_at: null,
          proof_url: null,
          proof_notes: null
        })
        .eq('id', gigId)
    }

    return { 
      gig: updatedGig, 
      pointsAwarded: gig.bounty_value,
      newBalance
    }
  } else {
    // Reject submission - return to claimed status or open
    const { data: updatedGig, error: updateError } = await client
      .from('marketplace_gigs')
      .update({
        status: 'claimed', // Give them another chance
        rejection_reason: body.rejection_reason || 'Submission not accepted',
        proof_url: null,
        proof_notes: null
      })
      .eq('id', gigId)
      .select()
      .single()

    if (updateError) {
      throw createError({ statusCode: 500, message: updateError.message })
    }

    return { gig: updatedGig, rejected: true }
  }
})
