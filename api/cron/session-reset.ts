/**
 * Scheduled Cron Job: Force logout all users
 * Runs daily at 3:00 AM PST (11:00 UTC)
 * 
 * This invalidates all refresh tokens, forcing users to re-authenticate
 * on their next app access. Good for:
 * - Security hygiene (stolen tokens expire)
 * - Employee terminations take effect overnight
 * - Clean session state daily
 */

import { createClient } from '@supabase/supabase-js'

export const config = {
  // Run at 3:00 AM PST = 11:00 UTC
  // Vercel Cron uses UTC timezone
  schedule: '0 11 * * *'
}

export default async function handler(req: Request) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Allow both Vercel's internal cron calls and manual calls with secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if it's Vercel's internal cron call
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    if (!isVercelCron) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Cron] Missing Supabase credentials')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
        // signOut with scope 'global' invalidates all sessions for this user
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

    // Log the reset event
    await supabaseAdmin.from('system_logs').insert({
      event_type: 'session_reset',
      event_data: {
        total_users: allUsers.length,
        signed_out: signedOut,
        errors: errors,
        triggered_at: new Date().toISOString()
      }
    }).catch(() => {
      // system_logs table may not exist, that's ok
    })

    console.log(`[Cron] Session reset complete: ${signedOut} signed out, ${errors} errors`)

    return new Response(JSON.stringify({
      success: true,
      message: `Daily session reset complete`,
      stats: {
        total_users: allUsers.length,
        signed_out: signedOut,
        errors: errors,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[Cron] Session reset failed:', error)
    return new Response(JSON.stringify({ 
      error: 'Session reset failed', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
