/**
 * ezyVet Dashboard Data
 *
 * GET /api/ezyvet/dashboard?clinicId=xxx
 *
 * Returns summary stats for the ezyVet integration dashboard:
 *  - Appointment counts/breakdowns
 *  - User/staff counts
 *  - Consult counts
 *  - Recent sync status
 *  - Webhook activity
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const query = getQuery(event)
  const clinicId = query.clinicId as string | undefined

  try {
    // Run all queries in parallel
    const [
      clinicsResult,
      appointmentStats,
      userStats,
      consultStats,
      recentSyncs,
      webhookStats,
    ] = await Promise.all([
      // 1. Clinics
      supabase.from('ezyvet_clinics')
        .select('id, label, site_uid, is_active')
        .eq('is_active', true),

      // 2. Appointment counts
      clinicId
        ? supabase.from('ezyvet_appointments')
            .select('status_name, start_at', { count: 'exact' })
            .eq('clinic_id', clinicId)
        : supabase.from('ezyvet_appointments')
            .select('status_name, clinic_id, start_at', { count: 'exact' }),

      // 3. User counts
      clinicId
        ? supabase.from('ezyvet_users')
            .select('role, is_active', { count: 'exact' })
            .eq('clinic_id', clinicId)
        : supabase.from('ezyvet_users')
            .select('role, is_active, clinic_id', { count: 'exact' }),

      // 4. Consult counts
      clinicId
        ? supabase.from('ezyvet_consults')
            .select('status', { count: 'exact' })
            .eq('clinic_id', clinicId)
        : supabase.from('ezyvet_consults')
            .select('status, clinic_id', { count: 'exact' }),

      // 5. Recent syncs
      supabase.from('ezyvet_api_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10),

      // 6. Webhook counts (last 24h)
      supabase.from('ezyvet_webhook_events')
        .select('event_type, processed', { count: 'exact' })
        .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Process appointment data for summary
    const appointments = appointmentStats.data || []
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const appointmentSummary = {
      total: appointmentStats.count || appointments.length,
      today: appointments.filter((a: any) =>
        a.start_at && a.start_at.startsWith(todayStr)
      ).length,
      byStatus: appointments.reduce((acc: Record<string, number>, a: any) => {
        const status = a.status_name || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}),
    }

    // Process user data
    const users = userStats.data || []
    const userSummary = {
      total: userStats.count || users.length,
      active: users.filter((u: any) => u.is_active).length,
      byRole: users.reduce((acc: Record<string, number>, u: any) => {
        const role = u.role || 'unknown'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {}),
    }

    // Process consult data
    const consults = consultStats.data || []
    const consultSummary = {
      total: consultStats.count || consults.length,
      byStatus: consults.reduce((acc: Record<string, number>, c: any) => {
        const status = c.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}),
    }

    // Last sync info
    const lastSync = recentSyncs.data?.[0] || null

    return {
      clinics: clinicsResult.data || [],
      appointments: appointmentSummary,
      users: userSummary,
      consults: consultSummary,
      lastSync,
      recentSyncs: recentSyncs.data || [],
      webhooks: {
        last24h: webhookStats.count || (webhookStats.data || []).length,
        processed: (webhookStats.data || []).filter((w: any) => w.processed).length,
        pending: (webhookStats.data || []).filter((w: any) => !w.processed).length,
      },
    }
  } catch (err) {
    logger.error('Failed to build ezyVet dashboard', err instanceof Error ? err : null, 'ezyvet-dashboard')
    throw createError({ statusCode: 500, message: 'Failed to load dashboard data' })
  }
})
