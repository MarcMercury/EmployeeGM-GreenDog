/**
 * POST /api/admin/sync-login-times
 * 
 * Updates last_login_at to NOW() for all users who have ever signed in.
 * This effectively "marks everyone as active" at the moment the button is pressed.
 * Only super_admin can access this endpoint.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || process.env.NUXT_PUBLIC_SUPABASE_KEY || '')
  
  // Verify the caller's token
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  
  if (authError || !callerUser) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Check if caller is super_admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || callerProfile?.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Super Admin access required'
    })
  }

  // Fetch all auth users with pagination
  let allAuthUsers: any[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const { data: { users: pageUsers }, error: authFetchError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    })

    if (authFetchError) {
      console.error('Error fetching auth users:', authFetchError)
      break
    }

    if (!pageUsers || pageUsers.length === 0) break

    allAuthUsers = [...allAuthUsers, ...pageUsers]

    if (pageUsers.length < perPage) break
    page++
  }

  // Update profiles.last_login_at to NOW() for all users who have ever signed in
  // This treats Sync as "mark everyone as active at this moment"
  const now = new Date().toISOString()
  let updatedCount = 0
  let skippedCount = 0
  let notFoundCount = 0
  const errors: string[] = []

  for (const authUser of allAuthUsers) {
    // Skip users who have never signed in (no session history)
    if (!authUser.last_sign_in_at) {
      skippedCount++
      continue
    }

    // Update last_login_at to NOW (current time), not the old last_sign_in_at
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ last_login_at: now })
      .eq('auth_user_id', authUser.id)
      .select('id')

    if (updateError) {
      errors.push(`Failed to update profile for ${authUser.email}: ${updateError.message}`)
    } else if (!updateResult || updateResult.length === 0) {
      // No profile found with this auth_user_id
      notFoundCount++
    } else {
      updatedCount++
    }
  }

  console.log(`[Sync Login Times] Updated ${updatedCount} profiles to NOW (${now}), skipped ${skippedCount} (never signed in), ${notFoundCount} profiles not found, ${errors.length} errors`)

  return {
    success: true,
    message: `Synced login times for ${updatedCount} users`,
    updated: updatedCount,
    skipped: skippedCount,
    notFound: notFoundCount,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined
  }
})
