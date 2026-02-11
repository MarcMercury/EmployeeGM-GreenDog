/**
 * GET /api/marketplace/wallet
 * Get current user's wallet balance
 */
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const adminClient = await serverSupabaseServiceRole(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user's profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  // Get employee linked to profile
  const { data: employee } = await adminClient
    .from('employees')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  if (!employee) {
    // Return empty wallet for non-employees
    return {
      hasWallet: false,
      wallet: null
    }
  }

  // Get or create wallet
  let { data: wallet, error } = await adminClient
    .from('employee_wallets')
    .select('*')
    .eq('employee_id', employee.id)
    .single()

  if (!wallet) {
    // Create wallet if doesn't exist
    const { data: newWallet, error: insertError } = await adminClient
      .from('employee_wallets')
      .insert({ employee_id: employee.id })
      .select()
      .single()

    if (insertError) {
      throw createError({ statusCode: 500, message: 'Failed to create wallet' })
    }
    wallet = newWallet
  }

  return {
    hasWallet: true,
    wallet,
    employeeId: employee.id
  }
})
