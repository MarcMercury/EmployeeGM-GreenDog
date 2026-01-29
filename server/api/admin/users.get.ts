/**
 * GET /api/admin/users
 * 
 * Fetches all user accounts (profiles with auth accounts)
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
    console.error('[Admin Users API] Missing credentials:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
    })
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

  // Fetch all profiles with auth accounts
  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      is_active,
      auth_user_id,
      avatar_url,
      phone,
      last_login_at,
      created_at,
      updated_at
    `)
    .not('auth_user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching users:', fetchError)
    throw createError({
      statusCode: 500,
      message: `Failed to fetch users: ${fetchError.message}`
    })
  }

  // Get auth user details for login status info with pagination
  // listUsers() only returns 50 users by default, so we need to paginate
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

  // Create a map of auth users for quick lookup
  const authUserMap = new Map(allAuthUsers.map(u => [u.id, u]))

  // Merge profile and auth user data
  const usersWithDetails = profiles?.map(profile => {
    const authUser = authUserMap.get(profile.auth_user_id!)
    return {
      ...profile,
      auth_email: authUser?.email,
      email_confirmed: authUser?.email_confirmed_at ? true : false,
      last_sign_in_at: authUser?.last_sign_in_at,
      created_at_auth: authUser?.created_at
    }
  }) || []

  return {
    success: true,
    users: usersWithDetails,
    total: usersWithDetails.length
  }
})
