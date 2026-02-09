/**
 * Scheduled Cron Job: Force logout all users
 * Called by Vercel Cron daily at 3:00 AM PST (11:00 UTC)
 * 
 * This invalidates all refresh tokens, forcing users to re-authenticate
 * on their next app access.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Verify this is a cron request
  const cronSecret = config.cronSecret
  const authHeader = getHeader(event, 'authorization')
  
  if (!cronSecret) {
    throw createError({
      statusCode: 500,
      message: 'CRON_SECRET not configured'
    })
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

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
    logger.cron('session-reset', 'started')
    
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
        logger.error('Error listing users', error as Error, 'SessionResetCron')
        break
      }

      if (!users || users.length === 0) break
      allUsers = [...allUsers, ...users]
      if (users.length < perPage) break
      page++
    }

    logger.info('Found users to sign out', 'SessionResetCron', { count: allUsers.length })

    // Sign out users in parallel chunks (avoids N+1 sequential API calls)
    let signedOut = 0
    let errors = 0
    const CHUNK_SIZE = 20

    for (let i = 0; i < allUsers.length; i += CHUNK_SIZE) {
      const chunk = allUsers.slice(i, i + CHUNK_SIZE)
      const results = await Promise.allSettled(
        chunk.map(user => supabaseAdmin.auth.admin.signOut(user.id, 'global'))
      )
      for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.error) {
          signedOut++
        } else {
          errors++
        }
      }
    }

    logger.cron('session-reset', 'completed', { signedOut, errors, totalUsers: allUsers.length })

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
    logger.cron('session-reset', 'failed', { error: error.message || 'Unknown error' })
    throw createError({
      statusCode: 500,
      message: error.message || 'Session reset failed'
    })
  }
})
