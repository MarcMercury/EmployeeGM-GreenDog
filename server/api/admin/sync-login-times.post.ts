/**
 * POST /api/admin/sync-login-times
 * 
 * Syncs last_sign_in_at from auth.users to profiles.last_login_at
 * Only super_admin can access this endpoint
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

  // Update profiles.last_login_at for each auth user that has signed in
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (const authUser of allAuthUsers) {
    if (!authUser.last_sign_in_at) {
      skippedCount++
      continue
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ last_login_at: authUser.last_sign_in_at })
      .eq('auth_user_id', authUser.id)

    if (updateError) {
      errors.push(`Failed to update profile for ${authUser.email}: ${updateError.message}`)
    } else {
      updatedCount++
    }
  }

  console.log(`[Sync Login Times] Updated ${updatedCount} profiles, skipped ${skippedCount} (never signed in), ${errors.length} errors`)

  return {
    success: true,
    message: `Synced login times for ${updatedCount} users`,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined
  }
})
