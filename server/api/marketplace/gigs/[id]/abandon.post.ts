/**
 * POST /api/marketplace/gigs/[id]/abandon
 * Abandon a claimed gig (applies flake penalty)
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

  // Get user's employee ID
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
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

  const isAdmin = ['admin', 'super_admin', 'hr_admin'].includes(profile.role)

  // Get gig
  const { data: gig, error: gigError } = await client
    .from('marketplace_gigs')
    .select('*')
    .eq('id', gigId)
    .single()

  if (gigError || !gig) {
    throw createError({ statusCode: 404, message: 'Gig not found' })
  }

  // Check ownership or admin
  if (!isAdmin && (!employee || gig.claimed_by !== employee.id)) {
    throw createError({ statusCode: 403, message: 'You did not claim this gig' })
  }

  if (gig.status !== 'claimed' && gig.status !== 'reviewing') {
    throw createError({ statusCode: 400, message: 'Gig cannot be abandoned in current status' })
  }

  const claimantId = gig.claimed_by

  // Apply flake penalty if applicable
  if (gig.flake_penalty > 0 && claimantId) {
    const { data: wallet } = await client
      .from('employee_wallets')
      .select('*')
      .eq('employee_id', claimantId)
      .single()

    if (wallet) {
      const penalty = Math.min(gig.flake_penalty, wallet.current_balance)
      const newBalance = wallet.current_balance - penalty

      if (penalty > 0) {
        // Deduct penalty
        await client
          .from('employee_wallets')
          .update({
            current_balance: newBalance,
            lifetime_spent: wallet.lifetime_spent + penalty
          })
          .eq('id', wallet.id)

        // Log transaction
        await client
          .from('marketplace_transactions')
          .insert({
            employee_id: claimantId,
            transaction_type: 'flake_penalty',
            amount: -penalty,
            balance_after: newBalance,
            gig_id: gig.id,
            description: `Abandoned/Expired: ${gig.title}`,
            created_by: profile.id
          })
      }
    }
  }

  // Reset gig to open
  const { data: updatedGig, error: updateError } = await client
    .from('marketplace_gigs')
    .update({
      status: 'open',
      claimed_by: null,
      claimed_at: null,
      proof_url: null,
      proof_notes: null,
      rejection_reason: null
    })
    .eq('id', gigId)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return { 
    gig: updatedGig, 
    penaltyApplied: gig.flake_penalty > 0 ? gig.flake_penalty : 0
  }
})
