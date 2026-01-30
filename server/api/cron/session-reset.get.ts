/**
 * Scheduled Cron Job: Force logout all users
 * Called by Vercel Cron daily at 3:00 AM PST (11:00 UTC)
 * 
 * This invalidates all refresh tokens, forcing users to re-authenticate
 * on their next app access.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Verify this is a cron request
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  const isVercelCron = getHeader(event, 'x-vercel-cron') === '1'
  
  // Allow Vercel's internal cron calls or manual calls with secret
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('[Cron] Starting daily session reset at', new Date().toISOString())
    
    // Get all users with pagination
    let allUsers: any[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (error) {
        console.error('[Cron] Error listing users:', error)
        break
      }

      if (!users || users.length === 0) break
      allUsers = [...allUsers, ...users]
      if (users.length < perPage) break
      page++
    }

    console.log(`[Cron] Found ${allUsers.length} users to sign out`)

    // Sign out each user (invalidates their refresh tokens)
    let signedOut = 0
    let errors = 0

    for (const user of allUsers) {
      try {
        const { error } = await supabaseAdmin.auth.admin.signOut(user.id, 'global')
        if (error) {
          console.warn(`[Cron] Failed to sign out ${user.email}:`, error.message)
          errors++
        } else {
          signedOut++
        }
      } catch (err) {
        errors++
      }
    }

    console.log(`[Cron] Session reset complete: ${signedOut} signed out, ${errors} errors`)

    return {
      success: true,
      message: `Daily session reset complete`,
      stats: {
        total_users: allUsers.length,
        signed_out: signedOut,
        errors: errors,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error: any) {
    console.error('[Cron] Session reset failed:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Session reset failed'
    })
  }
})
