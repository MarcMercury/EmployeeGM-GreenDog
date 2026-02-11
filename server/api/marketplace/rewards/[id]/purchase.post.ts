/**
 * POST /api/marketplace/rewards/[id]/purchase
 * Purchase a reward with points — uses atomic balance deduction to prevent double-spend
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const client = await serverSupabaseServiceRole(event)
  const rewardId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!rewardId) {
    throw createError({ statusCode: 400, message: 'Reward ID required' })
  }

  // Validate rewardId is UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(rewardId)) {
    throw createError({ statusCode: 400, message: 'Invalid reward ID format' })
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

  // Get reward details
  const { data: reward, error: rewardError } = await client
    .from('marketplace_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('is_active', true)
    .single()

  if (rewardError || !reward) {
    throw createError({ statusCode: 404, message: 'Reward not found or inactive' })
  }

  // Check stock
  if (reward.stock_quantity !== null && reward.stock_quantity <= 0) {
    throw createError({ statusCode: 400, message: 'Reward is out of stock' })
  }

  // Step 1: Get current wallet state
  const { data: wallet } = await client
    .from('employee_wallets')
    .select('id, current_balance, lifetime_spent')
    .eq('employee_id', employee.id)
    .single()

  if (!wallet) {
    throw createError({ statusCode: 500, message: 'Wallet not found' })
  }

  if (wallet.current_balance < reward.cost) {
    throw createError({ statusCode: 400, message: 'Insufficient Bones balance' })
  }

  const newBalance = wallet.current_balance - reward.cost

  // Step 2: Atomic conditional update — only succeeds if balance hasn't changed
  // This implements optimistic concurrency control via the current_balance check
  const { data: atomicResult, error: atomicError } = await client
    .from('employee_wallets')
    .update({
      current_balance: newBalance,
      lifetime_spent: wallet.lifetime_spent + reward.cost
    })
    .eq('id', wallet.id)
    .eq('current_balance', wallet.current_balance) // Optimistic lock: fails if balance changed
    .select('id, current_balance')
    .single()

  if (atomicError || !atomicResult) {
    // Another concurrent request modified the balance — retry or fail
    throw createError({
      statusCode: 409,
      message: 'Balance changed during purchase. Please try again.'
    })
  }

  // Step 3: Atomically decrement stock (only if limited)
  if (reward.stock_quantity !== null) {
    const { data: stockResult, error: stockError } = await client
      .from('marketplace_rewards')
      .update({ stock_quantity: reward.stock_quantity - 1 })
      .eq('id', rewardId)
      .gt('stock_quantity', 0) // Only update if stock > 0
      .select('stock_quantity')
      .single()

    if (stockError || !stockResult) {
      // Stock ran out during purchase — refund the wallet
      await client
        .from('employee_wallets')
        .update({
          current_balance: wallet.current_balance,
          lifetime_spent: wallet.lifetime_spent
        })
        .eq('id', wallet.id)

      throw createError({ statusCode: 400, message: 'Reward went out of stock. Purchase cancelled.' })
    }
  }

  // Step 4: Create transaction log
  const { data: transaction, error: txError } = await client
    .from('marketplace_transactions')
    .insert({
      employee_id: employee.id,
      transaction_type: 'reward_purchased',
      amount: -reward.cost,
      balance_after: newBalance,
      reward_id: reward.id,
      description: `Purchased: ${reward.title}`
    })
    .select()
    .single()

  if (txError) {
    logger.error('Transaction log error', txError, 'marketplace/purchase')
  }

  // Step 5: Create redemption record
  const { data: redemption, error: redemptionError } = await client
    .from('marketplace_redemptions')
    .insert({
      employee_id: employee.id,
      reward_id: reward.id,
      transaction_id: transaction?.id,
      cost_paid: reward.cost,
      status: reward.requires_approval ? 'pending' : 'approved'
    })
    .select()
    .single()

  if (redemptionError) {
    logger.error('Redemption log error', redemptionError, 'marketplace/purchase')
  }

  return {
    success: true,
    redemption,
    newBalance,
    reward
  }
})
