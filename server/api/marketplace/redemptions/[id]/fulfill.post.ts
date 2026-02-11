/**
 * POST /api/marketplace/redemptions/[id]/fulfill
 * Fulfill or deny a redemption request (admin only)
 */
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data: { user } } = await supabase.auth.getUser()
  const client = await serverSupabaseServiceRole(event)
  const redemptionId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!redemptionId) {
    throw createError({ statusCode: 400, message: 'Redemption ID required' })
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
  const action = body.action // 'fulfill' or 'deny'

  // Get redemption
  const { data: redemption, error: redemptionError } = await client
    .from('marketplace_redemptions')
    .select('*, employee:employees(id)')
    .eq('id', redemptionId)
    .single()

  if (redemptionError || !redemption) {
    throw createError({ statusCode: 404, message: 'Redemption not found' })
  }

  if (redemption.status !== 'pending' && redemption.status !== 'approved') {
    throw createError({ statusCode: 400, message: 'Redemption is not pending' })
  }

  if (action === 'fulfill') {
    const { data: updated, error } = await client
      .from('marketplace_redemptions')
      .update({
        status: 'fulfilled',
        fulfilled_by: profile.id,
        fulfilled_at: new Date().toISOString(),
        fulfillment_notes: body.notes || null
      })
      .eq('id', redemptionId)
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { redemption: updated, action: 'fulfilled' }
  } else if (action === 'deny') {
    // Refund the points
    const { data: wallet } = await client
      .from('employee_wallets')
      .select('*')
      .eq('employee_id', redemption.employee_id)
      .single()

    if (wallet) {
      const newBalance = wallet.current_balance + redemption.cost_paid

      await client
        .from('employee_wallets')
        .update({
          current_balance: newBalance,
          lifetime_spent: Math.max(0, wallet.lifetime_spent - redemption.cost_paid)
        })
        .eq('id', wallet.id)

      // Log refund transaction
      await client
        .from('marketplace_transactions')
        .insert({
          employee_id: redemption.employee_id,
          transaction_type: 'refund',
          amount: redemption.cost_paid,
          balance_after: newBalance,
          reward_id: redemption.reward_id,
          description: `Refund: Redemption denied`,
          created_by: profile.id
        })
    }

    const { data: updated, error } = await client
      .from('marketplace_redemptions')
      .update({
        status: 'denied',
        denial_reason: body.reason || 'Request denied'
      })
      .eq('id', redemptionId)
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { redemption: updated, action: 'denied', refunded: redemption.cost_paid }
  }

  throw createError({ statusCode: 400, message: 'Invalid action' })
})
