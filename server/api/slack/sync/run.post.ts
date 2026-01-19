/**
 * Slack Sync Service - Synchronize Users
 * =======================================
 * Main synchronization endpoint that compares all Employee GM users
 * with Slack users and updates the mapping table.
 * 
 * POST /api/slack/sync/run
 * Body: { triggered_by?: string, force?: boolean }
 */

import { serverSupabaseServiceRole } from '#supabase/server'

interface SlackUser {
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

interface SyncResult {
  ok: boolean
  syncLogId?: string
  summary?: {
    total_employees: number
    matched_count: number
    new_links_count: number
    deactivated_count: number
    pending_review_count: number
    errors_count: number
  }
  error?: string
}

export default defineEventHandler(async (event): Promise<SyncResult> => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const SLACK_BOT_TOKEN = config.slackBotToken || process.env.SLACK_BOT_TOKEN
  
  if (!SLACK_BOT_TOKEN) {
    return { ok: false, error: 'Slack bot token not configured' }
  }

  // Use Nuxt Supabase module's service role client
  const supabase = await serverSupabaseServiceRole(event)
  const triggeredBy = body?.triggered_by || 'system'
  const startedAt = new Date().toISOString()

  // Initialize sync log
  const { data: syncLog, error: syncLogError } = await supabase
    .from('slack_sync_logs')
    .insert({
      sync_type: body?.force ? 'manual' : 'scheduled',
      status: 'in_progress',
      started_at: startedAt,
      triggered_by: triggeredBy
    })
    .select()
    .single()

  if (syncLogError) {
    console.error('Failed to create sync log:', syncLogError)
  }

  const syncLogId = syncLog?.id

  try {
    // Step 1: Fetch all Slack users
    const slackUsers = await fetchAllSlackUsers(SLACK_BOT_TOKEN)
    
    // Step 2: Fetch all Employee GM users (employees + profiles)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email_work, email_personal, first_name, last_name, slack_user_id, slack_status, employment_status')
    
    if (empError) throw new Error(`Failed to fetch employees: ${empError.message}`)

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, slack_user_id, slack_status, role')
    
    if (profError) throw new Error(`Failed to fetch profiles: ${profError.message}`)

    // Step 3: Build email lookup maps
    const slackByEmail = new Map<string, SlackUser>()
    const activeSlackIds = new Set<string>()
    
    for (const user of slackUsers) {
      if (user.is_bot || !user.profile?.email) continue
      const email = user.profile.email.toLowerCase().trim()
      slackByEmail.set(email, user)
      if (!user.deleted) {
        activeSlackIds.add(user.id)
      }
    }

    // Step 4: Process synchronization
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
          // No email - flag for review
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
          // Match found
          const isDeactivated = slackUser.deleted
          const newStatus = isDeactivated ? 'deactivated' : 'linked'
          
          if (!emp.slack_user_id || emp.slack_user_id !== slackUser.id) {
            // New link
            summary.new_links_count++
          }
          
          if (isDeactivated && emp.slack_status !== 'deactivated') {
            summary.deactivated_count++
          }

          // Update employee
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              slack_user_id: slackUser.id,
              slack_status: newStatus,
              last_slack_sync: now
            })
            .eq('id', emp.id)

          if (updateError) {
            errors.push({ employee_id: emp.id, error: updateError.message })
            summary.errors_count++
          } else {
            summary.matched_count++
          }
        } else {
          // No match in Slack
          if (emp.slack_user_id) {
            // Previously linked, now missing
            conflicts.push({
              employee_id: emp.id,
              conflict_type: 'deactivated_in_slack',
              employee_email: email,
              slack_user_id: emp.slack_user_id,
              details: { reason: 'Previously linked Slack user no longer found' }
            })
          } else {
            // Never linked
            conflicts.push({
              employee_id: emp.id,
              conflict_type: 'no_match',
              employee_email: email,
              details: { reason: 'No Slack user found with matching email' }
            })
          }
          
          // Update status to unlinked if not already
          if (emp.slack_status !== 'unlinked' && emp.slack_status !== 'pending_review') {
            await supabase
              .from('employees')
              .update({ 
                slack_status: 'pending_review',
                last_slack_sync: now
              })
              .eq('id', emp.id)
          }
          
          summary.pending_review_count++
        }
      } catch (err: any) {
        errors.push({ employee_id: emp.id, error: err.message })
        summary.errors_count++
      }
    }

    // Process profiles (for users without employee records)
    for (const prof of profiles || []) {
      try {
        if (!prof.email) continue
        const email = prof.email.toLowerCase().trim()
        const slackUser = slackByEmail.get(email)

        if (slackUser) {
          const isDeactivated = slackUser.deleted
          const newStatus = isDeactivated ? 'deactivated' : 'linked'

          await supabase
            .from('profiles')
            .update({
              slack_user_id: slackUser.id,
              slack_status: newStatus,
              last_slack_sync: now
            })
            .eq('id', prof.id)
        }
      } catch (err: any) {
        errors.push({ profile_id: prof.id, error: err.message })
        summary.errors_count++
      }
    }

    // Step 5: Check for deactivated users who are still marked as linked
    const { data: linkedEmployees } = await supabase
      .from('employees')
      .select('id, slack_user_id')
      .eq('slack_status', 'linked')
      .not('slack_user_id', 'is', null)

    for (const emp of linkedEmployees || []) {
      if (emp.slack_user_id && !activeSlackIds.has(emp.slack_user_id)) {
        await supabase
          .from('employees')
          .update({ slack_status: 'deactivated', last_slack_sync: now })
          .eq('id', emp.id)
        summary.deactivated_count++
      }
    }

    // Step 6: Insert conflicts for manual review
    if (conflicts.length > 0) {
      await supabase.from('slack_sync_conflicts').insert(
        conflicts.map(c => ({
          ...c,
          status: 'pending',
          created_at: now
        }))
      )
    }

    // Step 7: Update sync log with results
    const finalStatus = errors.length > 0 ? (errors.length === employees?.length ? 'failed' : 'partial') : 'success'
    
    if (syncLogId) {
      await supabase
        .from('slack_sync_logs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          ...summary,
          error_details: errors.length > 0 ? errors : null,
          summary: { conflicts: conflicts.length }
        })
        .eq('id', syncLogId)
    }

    return { 
      ok: true, 
      syncLogId,
      summary
    }

  } catch (error: any) {
    console.error('Sync failed:', error)
    
    // Update sync log with failure
    if (syncLogId) {
      await supabase
        .from('slack_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: [{ error: error.message }]
        })
        .eq('id', syncLogId)
    }

    return { ok: false, error: error.message, syncLogId }
  }
})

/**
 * Fetch all Slack users with pagination
 */
async function fetchAllSlackUsers(token: string): Promise<SlackUser[]> {
  const users: SlackUser[] = []
  let cursor: string | undefined = undefined

  do {
    const url = new URL('https://slack.com/api/users.list')
    if (cursor) url.searchParams.set('cursor', cursor)
    url.searchParams.set('limit', '200')
    
    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const data: any = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }
    
    users.push(...data.members)
    cursor = data.response_metadata?.next_cursor || undefined
  } while (cursor)

  return users
}
