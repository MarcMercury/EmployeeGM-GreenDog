/**
 * POST /api/marketplace/check-expired
 * Check and process expired gigs (Reaper logic)
 * Can be called periodically or on page load
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const client = await serverSupabaseServiceRole(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Only admins/managers can trigger the reaper
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'sup_admin', 'manager', 'hr_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin or manager access required' })
  }

  // Find all claimed gigs that have expired
  const { data: expiredGigs, error: queryError } = await client
    .from('marketplace_gigs')
    .select('*')
    .eq('status', 'claimed')
    .not('claimed_at', 'is', null)

  if (queryError) {
    throw createError({ statusCode: 500, message: queryError.message })
  }

  const now = new Date()
  const processed: string[] = []
  const penalties: { gigId: string; employeeId: string; penalty: number }[] = []

  for (const gig of expiredGigs || []) {
    const claimedAt = new Date(gig.claimed_at)
    const deadline = new Date(claimedAt.getTime() + gig.duration_minutes * 60 * 1000)

    if (now > deadline) {
      // This gig has expired
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
                description: `Expired: ${gig.title}`
              })

            penalties.push({
              gigId: gig.id,
              employeeId: claimantId,
              penalty
            })
          }
        }
      }

      // Reset gig to open
      await client
        .from('marketplace_gigs')
        .update({
          status: 'open',
          claimed_by: null,
          claimed_at: null,
          proof_url: null,
          proof_notes: null
        })
        .eq('id', gig.id)

      processed.push(gig.id)
    }
  }

  return {
    processed: processed.length,
    processedGigs: processed,
    penalties
  }
})
