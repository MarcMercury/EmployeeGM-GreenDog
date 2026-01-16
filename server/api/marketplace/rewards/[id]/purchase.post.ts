/**
 * POST /api/marketplace/rewards/[id]/purchase
 * Purchase a reward with points
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  const rewardId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!rewardId) {
    throw createError({ statusCode: 400, message: 'Reward ID required' })
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

  // Get reward
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

  // Get wallet
  const { data: wallet, error: walletError } = await client
    .from('employee_wallets')
    .select('*')
    .eq('employee_id', employee.id)
    .single()

  if (walletError || !wallet) {
    throw createError({ statusCode: 500, message: 'Wallet not found' })
  }

  // Check balance
  if (wallet.current_balance < reward.cost) {
    throw createError({ statusCode: 400, message: 'Insufficient Bones balance' })
  }

  const newBalance = wallet.current_balance - reward.cost

  // Deduct from wallet
  const { error: walletUpdateError } = await client
    .from('employee_wallets')
    .update({
      current_balance: newBalance,
      lifetime_spent: wallet.lifetime_spent + reward.cost
    })
    .eq('id', wallet.id)

  if (walletUpdateError) {
    throw createError({ statusCode: 500, message: 'Failed to update wallet' })
  }

  // Create transaction
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
    console.error('Transaction log error:', txError)
  }

  // Create redemption record
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
    console.error('Redemption log error:', redemptionError)
  }

  // Decrease stock if limited
  if (reward.stock_quantity !== null) {
    await client
      .from('marketplace_rewards')
      .update({ stock_quantity: reward.stock_quantity - 1 })
      .eq('id', rewardId)
  }

  return {
    success: true,
    redemption,
    newBalance,
    reward
  }
})
