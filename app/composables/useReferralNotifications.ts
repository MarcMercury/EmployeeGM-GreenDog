/**
 * Referral Notifications Composable
 * ==================================
 * Sends Activity Hub notifications to Admins, Managers, and Marketing Admins
 * whenever a referral contact is updated — either from a clinic visit or a
 * report upload.
 *
 * Target roles: super_admin, admin, manager, marketing_admin
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Roles that should receive referral contact notifications */
const REFERRAL_NOTIFY_ROLES = ['super_admin', 'admin', 'manager', 'marketing_admin'] as const

interface ReferralVisitPayload {
  partnerName: string
  partnerId: string
  spokeTo: string | null
  visitDate: string
  visitNotes?: string | null
  loggedBy: string // full name of the person who logged the visit
}

interface ReferralReportPayload {
  partnersUpdated: number
  reportType: 'revenue' | 'statistics'
  uploadedBy: string // full name of the uploader
  /** Optional: list of partner names that were updated */
  partnerNames?: string[]
}

export function useReferralNotifications() {
  const supabase = useSupabaseClient() as SupabaseClient

  /**
   * Fetch profile IDs for all users with notification-eligible roles.
   * Optionally excludes a specific profile (e.g. the person who triggered the action).
   */
  async function getNotifyTargets(excludeProfileId?: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', [...REFERRAL_NOTIFY_ROLES])

      if (error) {
        console.error('[ReferralNotifications] Error fetching targets:', error)
        return []
      }

      return (data || [])
        .map(p => p.id)
        .filter(id => id !== excludeProfileId)
    } catch (err) {
      console.error('[ReferralNotifications] Unexpected error:', err)
      return []
    }
  }

  /**
   * Send a notification to a single profile.
   */
  async function insertNotification(params: {
    profileId: string
    type: string
    category: string
    title: string
    body: string
    data?: Record<string, any>
    requiresAction?: boolean
  }) {
    const { error } = await supabase.from('notifications').insert({
      profile_id: params.profileId,
      type: params.type,
      category: params.category,
      title: params.title,
      body: params.body,
      data: params.data || null,
      requires_action: params.requiresAction || false,
      is_read: false,
    })
    if (error) {
      console.error('[ReferralNotifications] Insert error for', params.profileId, error)
    }
  }

  /**
   * Notify all eligible roles that a referral contact was updated via a clinic visit.
   */
  async function notifyReferralVisit(payload: ReferralVisitPayload, excludeProfileId?: string) {
    const targets = await getNotifyTargets(excludeProfileId)
    if (!targets.length) return

    const spokeInfo = payload.spokeTo ? ` — spoke with ${payload.spokeTo}` : ''
    const title = `🤝 Referral Visit: ${payload.partnerName}`
    const body = `${payload.loggedBy} logged a visit to ${payload.partnerName} on ${formatDateShort(payload.visitDate)}${spokeInfo}.`

    const data: Record<string, any> = {
      url: '/marketing/partnerships',
      action_label: 'View Partnership',
      partner_id: payload.partnerId,
      partner_name: payload.partnerName,
      spoke_to: payload.spokeTo,
      visit_date: payload.visitDate,
      source: 'clinic_visit',
    }

    const inserts = targets.map(profileId =>
      insertNotification({
        profileId,
        type: 'referral_visit_logged',
        category: 'referrals',
        title,
        body,
        data,
        requiresAction: false,
      })
    )

    await Promise.allSettled(inserts)
    console.log(`[ReferralNotifications] Visit notification sent to ${targets.length} recipients`)
  }

  /**
   * Notify all eligible roles that referral data was updated via a report upload.
   */
  async function notifyReferralReportUpload(payload: ReferralReportPayload, excludeProfileId?: string) {
    const targets = await getNotifyTargets(excludeProfileId)
    if (!targets.length) return

    const reportLabel = payload.reportType === 'revenue' ? 'Revenue Report' : 'Statistics Report'
    const title = `🤝 Referral Data Updated: ${reportLabel}`
    const body = `${payload.uploadedBy} uploaded a ${reportLabel} — ${payload.partnersUpdated} partner${payload.partnersUpdated === 1 ? '' : 's'} updated.`

    const data: Record<string, any> = {
      url: '/marketing/partnerships',
      action_label: 'View Partnerships',
      partners_updated: payload.partnersUpdated,
      report_type: payload.reportType,
      source: 'report_upload',
    }
    if (payload.partnerNames?.length) {
      data.partner_names = payload.partnerNames.slice(0, 10) // cap at 10 for payload size
    }

    const inserts = targets.map(profileId =>
      insertNotification({
        profileId,
        type: 'referral_report_uploaded',
        category: 'referrals',
        title,
        body,
        data,
        requiresAction: false,
      })
    )

    await Promise.allSettled(inserts)
    console.log(`[ReferralNotifications] Report upload notification sent to ${targets.length} recipients`)
  }

  /**
   * Notify all eligible roles that a referral partner's contact info changed.
   */
  async function notifyReferralContactUpdated(params: {
    partnerName: string
    partnerId: string
    changedFields: string[]
    updatedBy: string
  }, excludeProfileId?: string) {
    const targets = await getNotifyTargets(excludeProfileId)
    if (!targets.length) return

    const title = `🤝 Referral Contact Updated: ${params.partnerName}`
    const fields = params.changedFields.join(', ')
    const body = `${params.updatedBy} updated ${params.partnerName}: ${fields}.`

    const data: Record<string, any> = {
      url: '/marketing/partnerships',
      action_label: 'View Partner',
      partner_id: params.partnerId,
      partner_name: params.partnerName,
      changed_fields: params.changedFields,
      source: 'contact_update',
    }

    const inserts = targets.map(profileId =>
      insertNotification({
        profileId,
        type: 'referral_contact_updated',
        category: 'referrals',
        title,
        body,
        data,
        requiresAction: false,
      })
    )

    await Promise.allSettled(inserts)
    console.log(`[ReferralNotifications] Contact update notification sent to ${targets.length} recipients`)
  }

  return {
    notifyReferralVisit,
    notifyReferralReportUpload,
    notifyReferralContactUpdated,
    getNotifyTargets,
  }
}

// Utility: short date format
function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
