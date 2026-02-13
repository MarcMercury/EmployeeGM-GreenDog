/**
 * Cron: Safety Log Due-Date Checker
 *
 * Runs daily at 9:00 AM UTC (1:00 AM PST).
 * For each safety_log_schedules row with a non-'none' cadence:
 *   • Check if a matching safety_logs entry exists within the current period
 *   • If overdue → send in-app notifications to managers/admins at that location
 *     AND queue a Slack notification to the HR channel
 *   • Update last_notified_at to suppress duplicate alerts
 *
 * Configure in vercel.json:
 * { "path": "/api/cron/safety-log-reminders", "schedule": "0 9 * * *" }
 */

import { createAdminClient } from '../../utils/intake'

interface OverdueSchedule {
  id: string
  log_type: string
  location: string
  cadence: string
  last_completed_at: string | null
  last_notified_at: string | null
}

const CADENCE_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  biannual: 182,
  annual: 365,
}

const LOCATION_LABELS: Record<string, string> = {
  venice: 'Venice',
  sherman_oaks: 'Sherman Oaks',
  van_nuys: 'Van Nuys',
}

export default defineEventHandler(async (event) => {
  // Auth
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  if (!config.cronSecret || authHeader !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = createAdminClient() as any
  const now = new Date()
  const results = {
    checked: 0,
    overdue: 0,
    notificationsSent: 0,
    errors: [] as string[],
  }

  try {
    // 1. Get all active schedules (cadence != 'none')
    const { data: schedules, error: schedErr } = await supabase
      .from('safety_log_schedules')
      .select('*')
      .neq('cadence', 'none')

    if (schedErr) throw new Error(schedErr.message)
    if (!schedules || schedules.length === 0) {
      return { ok: true, message: 'No active schedules', ...results }
    }

    results.checked = schedules.length

    for (const sched of schedules as OverdueSchedule[]) {
      const periodDays = CADENCE_DAYS[sched.cadence]
      if (!periodDays) continue

      const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

      // 2. Check if there's a completed log within the period
      const { count } = await supabase
        .from('safety_logs')
        .select('id', { count: 'exact', head: true })
        .eq('log_type', sched.log_type)
        .eq('location', sched.location)
        .gte('submitted_at', cutoff.toISOString())

      if ((count ?? 0) > 0) {
        // Up to date — update last_completed_at
        await supabase
          .from('safety_log_schedules')
          .update({ last_completed_at: now.toISOString() })
          .eq('id', sched.id)
        continue
      }

      // 3. Overdue! Check if we already notified recently (suppress within 7 days)
      if (sched.last_notified_at) {
        const lastNotified = new Date(sched.last_notified_at)
        const daysSinceNotification = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceNotification < 7) continue
      }

      results.overdue++

      const logLabel = sched.log_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      const locLabel = LOCATION_LABELS[sched.location] || sched.location

      // 4. Get manager/admin profiles for this location to send in-app notifications
      const notifyRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin']
      const { data: targets } = await supabase
        .from('profiles')
        .select('id')
        .in('role', notifyRoles)
        .eq('is_active', true)

      if (targets && targets.length > 0) {
        const notifications = targets.map((t: { id: string }) => ({
          profile_id: t.id,
          type: 'safety_log_overdue',
          category: 'safety',
          title: `⚠️ Safety Log Overdue: ${logLabel}`,
          body: `The ${sched.cadence} "${logLabel}" log for ${locLabel} has not been completed this period. Please ensure it is submitted.`,
          data: {
            log_type: sched.log_type,
            location: sched.location,
            cadence: sched.cadence,
            link: `/med-ops/safety/${sched.log_type.replace(/_/g, '-')}?location=${sched.location}`,
          },
          is_read: false,
        }))

        const { error: notifErr } = await supabase
          .from('notifications')
          .insert(notifications)

        if (notifErr) {
          results.errors.push(`In-app notify error for ${sched.log_type}@${sched.location}: ${notifErr.message}`)
        } else {
          results.notificationsSent += notifications.length
        }
      }

      // 5. Queue Slack notification to HR channel
      try {
        const { data: channelSetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'hr_notifications_channel')
          .single()

        const channel = channelSetting?.value as string | null
        if (channel) {
          await supabase.from('notification_queue').insert({
            channel,
            message: `⚠️ *Safety Log Overdue*: _${logLabel}_ at *${locLabel}* (${sched.cadence} cadence). No log submitted this period.`,
            priority: 'normal',
            status: 'pending',
            scheduled_for: now.toISOString(),
            metadata: {
              source: 'safety_log_cron',
              log_type: sched.log_type,
              location: sched.location,
            },
          })
          results.notificationsSent++
        }
      } catch {
        // Slack channel not configured — skip silently
      }

      // 6. Update last_notified_at
      await supabase
        .from('safety_log_schedules')
        .update({ last_notified_at: now.toISOString() })
        .eq('id', sched.id)
    }
  } catch (err: any) {
    results.errors.push(err.message || 'Unknown error')
  }

  return { ok: true, ...results }
})
