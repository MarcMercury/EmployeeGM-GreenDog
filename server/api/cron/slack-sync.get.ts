/**
 * Vercel Cron: Slack User Sync + Notification Processing
 * =======================================================
 * Runs every 6 hours via Vercel Cron.
 * Uses the same auth pattern (Authorization: Bearer <CRON_SECRET>) as all other crons.
 *
 * Configure in vercel.json:
 * { "path": "/api/cron/slack-sync", "schedule": "0 */6 * * *" }
 *
 * What it does:
 *   1. Fetches all Slack workspace users (paginated)
 *   2. Matches them to Employee GM employees/profiles by email
 *   3. Updates slack_user_id and slack_status on each record
 *   4. Creates conflict records for unresolvable mismatches
 *   5. Processes any pending notification queue items
 *   6. Alerts admins if there are pending conflicts
 */

import { serverSupabaseServiceRole } from '#supabase/server'

interface SlackMember {
  id: string
  name: string
  real_name: string
  deleted: boolean
  is_bot: boolean
  profile: {
    email?: string
    display_name?: string
    real_name?: string
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const config = useRuntimeConfig()

  // ── Auth: same pattern as every other Vercel cron ──
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = config.cronSecret

  if (!cronSecret) {
    logger.error('[SlackSyncCron] CRON_SECRET not configured', null, 'SlackSyncCron')
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[SlackSyncCron] Unauthorized cron attempt')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const SLACK_BOT_TOKEN = config.slackBotToken
  if (!SLACK_BOT_TOKEN) {
    logger.error('[SlackSyncCron] SLACK_BOT_TOKEN not configured', null, 'SlackSyncCron')
    return { ok: false, error: 'Slack bot token not configured' }
  }

  logger.cron('slack-sync', 'started', { timestamp: new Date().toISOString() })

  // Use service role — no user session needed for cron
  const supabase = await serverSupabaseServiceRole(event)

  const results = {
    sync: null as any,
    notifications: null as any,
    pendingConflicts: 0,
    durationMs: 0
  }

  try {
    // ── Check cooldown (skip if last sync < 4 hours ago) ──
    const { data: lastSync } = await supabase
      .from('slack_sync_logs')
      .select('completed_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (lastSync?.completed_at) {
      const hoursSince = (Date.now() - new Date(lastSync.completed_at).getTime()) / 3_600_000
      if (hoursSince < 4) {
        logger.cron('slack-sync', 'skipped', { hoursSinceLastSync: hoursSince.toFixed(1) })
        return { ok: true, skipped: true, message: `Last sync was ${hoursSince.toFixed(1)}h ago` }
      }
    }

    // ── Step 1: Run user sync ──
    results.sync = await runSlackSync(supabase, SLACK_BOT_TOKEN)

    // ── Step 2: Process notification queue ──
    results.notifications = await processNotificationQueue(supabase, SLACK_BOT_TOKEN)

    // ── Step 3: Alert admins about pending conflicts ──
    const { count: pendingConflicts } = await supabase
      .from('slack_sync_conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    results.pendingConflicts = pendingConflicts || 0

    if (results.pendingConflicts > 0) {
      const adminChannel = await getAdminChannel(supabase)
      if (adminChannel) {
        await supabase.from('notification_queue').insert({
          channel: adminChannel,
          message: `⚠️ *Slack Sync Alert*\n\nThere are ${results.pendingConflicts} pending conflicts requiring review.\n\nVisit Admin → Slack Integration → User Sync to resolve.`,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
          metadata: { type: 'admin_alert', pending_conflicts: results.pendingConflicts }
        })
      }
    }

    results.durationMs = Date.now() - startTime
    logger.cron('slack-sync', 'completed', results)

    return { ok: true, ...results }
  } catch (error: any) {
    logger.error('[SlackSyncCron] Failed', error, 'SlackSyncCron')
    return { ok: false, error: error.message, durationMs: Date.now() - startTime }
  }
})

// ─────────────────────────────────────────────────────────
//  Core sync logic (copied from sync/run.post.ts, but using
//  service-role client directly instead of requiring user auth)
// ─────────────────────────────────────────────────────────
async function runSlackSync(supabase: any, token: string) {
  const startedAt = new Date().toISOString()

  // Create sync log
  const { data: syncLog } = await supabase
    .from('slack_sync_logs')
    .insert({
      sync_type: 'scheduled',
      status: 'in_progress',
      started_at: startedAt,
      triggered_by: 'vercel_cron'
    })
    .select()
    .single()

  const syncLogId = syncLog?.id

  try {
    // Fetch all Slack users (paginated)
    const slackUsers = await fetchAllSlackUsers(token)

    // Fetch Employee GM data
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, email_work, email_personal, first_name, last_name, slack_user_id, slack_status, employment_status')

    if (empErr) throw new Error(`Failed to fetch employees: ${empErr.message}`)

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, slack_user_id, slack_status, role')

    if (profErr) throw new Error(`Failed to fetch profiles: ${profErr.message}`)

    // Build email → Slack user map
    const slackByEmail = new Map<string, SlackMember>()
    const activeSlackIds = new Set<string>()

    for (const user of slackUsers) {
      if (user.is_bot || !user.profile?.email) continue
      const email = user.profile.email.toLowerCase().trim()
      slackByEmail.set(email, user)
      if (!user.deleted) activeSlackIds.add(user.id)
    }

    const summary = {
      total_employees: employees?.length || 0,
      matched_count: 0,
      new_links_count: 0,
      deactivated_count: 0,
      pending_review_count: 0,
      errors_count: 0
    }
    const errors: any[] = []
    const conflicts: any[] = []
    const now = new Date().toISOString()

    // Process employees
    for (const emp of employees || []) {
      try {
        const email = (emp.email_work || emp.email_personal || '').toLowerCase().trim()
        if (!email) {
          conflicts.push({
            employee_id: emp.id,
            conflict_type: 'no_match',
            employee_email: null,
            details: { reason: 'Employee has no email address' }
          })
          summary.pending_review_count++
          continue
        }

        const slackUser = slackByEmail.get(email)
        if (slackUser) {
          const isDeactivated = slackUser.deleted
          const newStatus = isDeactivated ? 'deactivated' : 'linked'

          if (!emp.slack_user_id || emp.slack_user_id !== slackUser.id) summary.new_links_count++
          if (isDeactivated && emp.slack_status !== 'deactivated') summary.deactivated_count++

          const { error: updateErr } = await supabase
            .from('employees')
            .update({ slack_user_id: slackUser.id, slack_status: newStatus, last_slack_sync: now })
            .eq('id', emp.id)

          if (updateErr) { errors.push({ employee_id: emp.id, error: updateErr.message }); summary.errors_count++ }
          else summary.matched_count++
        } else {
          if (emp.slack_user_id) {
            conflicts.push({
              employee_id: emp.id,
              conflict_type: 'deactivated_in_slack',
              employee_email: email,
              slack_user_id: emp.slack_user_id,
              details: { reason: 'Previously linked Slack user no longer found' }
            })
          } else {
            conflicts.push({
              employee_id: emp.id,
              conflict_type: 'no_match',
              employee_email: email,
              details: { reason: 'No Slack user found with matching email' }
            })
          }
          if (emp.slack_status !== 'unlinked' && emp.slack_status !== 'pending_review') {
            await supabase.from('employees').update({ slack_status: 'pending_review', last_slack_sync: now }).eq('id', emp.id)
          }
          summary.pending_review_count++
        }
      } catch (err: any) {
        errors.push({ employee_id: emp.id, error: err.message })
        summary.errors_count++
      }
    }

    // Process profiles (users without employee records)
    for (const prof of profiles || []) {
      try {
        if (!prof.email) continue
        const email = prof.email.toLowerCase().trim()
        const slackUser = slackByEmail.get(email)
        if (slackUser) {
          await supabase.from('profiles').update({
            slack_user_id: slackUser.id,
            slack_status: slackUser.deleted ? 'deactivated' : 'linked',
            last_slack_sync: now
          }).eq('id', prof.id)
        }
      } catch (err: any) {
        errors.push({ profile_id: prof.id, error: err.message })
        summary.errors_count++
      }
    }

    // Check for deactivated users still marked as linked
    const { data: linkedEmployees } = await supabase
      .from('employees')
      .select('id, slack_user_id')
      .eq('slack_status', 'linked')
      .not('slack_user_id', 'is', null)

    for (const emp of linkedEmployees || []) {
      if (emp.slack_user_id && !activeSlackIds.has(emp.slack_user_id)) {
        await supabase.from('employees').update({ slack_status: 'deactivated', last_slack_sync: now }).eq('id', emp.id)
        summary.deactivated_count++
      }
    }

    // Insert conflicts
    if (conflicts.length > 0) {
      await supabase.from('slack_sync_conflicts').insert(
        conflicts.map((c: any) => ({ ...c, status: 'pending', created_at: now }))
      )
    }

    // Finalize sync log
    const finalStatus = errors.length > 0 ? (errors.length === (employees?.length || 0) ? 'failed' : 'partial') : 'success'
    if (syncLogId) {
      await supabase.from('slack_sync_logs').update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        ...summary,
        error_details: errors.length > 0 ? errors : null,
        summary: { conflicts: conflicts.length }
      }).eq('id', syncLogId)
    }

    return { ok: true, syncLogId, summary }
  } catch (error: any) {
    if (syncLogId) {
      await supabase.from('slack_sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: [{ error: error.message }]
      }).eq('id', syncLogId)
    }
    throw error
  }
}

// ─────────────────────────────────────────────────────────
//  Notification queue processor
// ─────────────────────────────────────────────────────────
async function processNotificationQueue(supabase: any, token: string) {
  const now = new Date().toISOString()

  const { data: notifications, error: fetchErr } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(100)

  if (fetchErr) return { ok: false, error: fetchErr.message }
  if (!notifications?.length) return { ok: true, processed: 0 }

  let success = 0
  let failed = 0

  for (const n of notifications) {
    try {
      let channelId = n.channel

      // Open DM if needed
      if (n.slack_user_id && !channelId) {
        const openRes = await fetch('https://slack.com/api/conversations.open', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: n.slack_user_id })
        })
        const openData: any = await openRes.json()
        if (!openData.ok) throw new Error(`DM open failed: ${openData.error}`)
        channelId = openData.channel.id
      }

      if (!channelId) throw new Error('No channel specified')

      const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelId, text: n.message, blocks: n.blocks })
      })
      const msgData: any = await msgRes.json()
      if (!msgData.ok) throw new Error(`Slack API: ${msgData.error}`)

      await supabase.from('notification_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', n.id)
      success++
    } catch (err: any) {
      const retryCount = (n.retry_count || 0) + 1
      await supabase.from('notification_queue').update({
        status: retryCount < (n.max_retries || 3) ? 'pending' : 'failed',
        retry_count: retryCount,
        error_message: err.message
      }).eq('id', n.id)
      failed++
    }
  }

  return { ok: true, processed: notifications.length, success, failed }
}

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
async function fetchAllSlackUsers(token: string): Promise<SlackMember[]> {
  const users: SlackMember[] = []
  let cursor: string | undefined

  do {
    const url = new URL('https://slack.com/api/users.list')
    if (cursor) url.searchParams.set('cursor', cursor)
    url.searchParams.set('limit', '200')

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data: any = await response.json()
    if (!data.ok) throw new Error(`Slack users.list failed: ${data.error}`)

    users.push(...data.members)
    cursor = data.response_metadata?.next_cursor || undefined
  } while (cursor)

  return users
}

async function getAdminChannel(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'slack_general_notifications_channel')
    .single()
  return data?.value || null
}
