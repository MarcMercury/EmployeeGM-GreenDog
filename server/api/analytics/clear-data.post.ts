/**
 * Analytics Data Clear API
 *
 * POST /api/analytics/clear-data
 * Body: { scope: 'invoices' | 'contacts' | 'all' }
 *
 * Clears uploaded analytics data so the user can start fresh with
 * new inputs. Admin / super_admin only.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required to clear analytics data' })
  }

  const body = await readBody<{ scope?: 'invoices' | 'contacts' | 'all' }>(event)
  const scope = body?.scope || 'all'

  const result = { invoicesDeleted: 0, contactsDeleted: 0, appointmentsDeleted: 0 }

  try {
    if (scope === 'invoices' || scope === 'all') {
      const { count: before } = await supabase
        .from('invoice_lines')
        .select('*', { count: 'exact', head: true })
      const { error } = await supabase
        .from('invoice_lines')
        .delete()
        .not('invoice_number', 'is', null) // matches every row (PK is non-null)
      if (error) throw error
      result.invoicesDeleted = before || 0
    }

    if (scope === 'contacts' || scope === 'all') {
      const { count: before } = await supabase
        .from('ezyvet_crm_contacts')
        .select('*', { count: 'exact', head: true })
      const { error } = await supabase
        .from('ezyvet_crm_contacts')
        .delete()
        .not('ezyvet_contact_code', 'is', null)
      if (error) throw error
      result.contactsDeleted = before || 0
    }

    // The analytics dashboard (performance + practice-overview reports) also
    // reads appointment data, so a full clear must wipe those tables too —
    // otherwise stale numbers keep showing up after "clear everything".
    if (scope === 'all') {
      const { count: apptBefore } = await supabase
        .from('appointment_data')
        .select('*', { count: 'exact', head: true })
      const { error: apptErr } = await supabase
        .from('appointment_data')
        .delete()
        .not('id', 'is', null) // matches every row (PK is non-null)
      if (apptErr) throw apptErr
      result.appointmentsDeleted += apptBefore || 0

      const { count: ezyApptBefore } = await supabase
        .from('ezyvet_appointments')
        .select('*', { count: 'exact', head: true })
      const { error: ezyApptErr } = await supabase
        .from('ezyvet_appointments')
        .delete()
        .not('id', 'is', null)
      if (ezyApptErr) throw ezyApptErr
      result.appointmentsDeleted += ezyApptBefore || 0

      // Appointment Type summary report also feeds the appointment-value report.
      const { error: typeErr } = await supabase
        .from('appointment_type_summary')
        .delete()
        .not('id', 'is', null)
      if (typeErr) throw typeErr
    }

    return {
      success: true,
      scope,
      ...result,
      message: `Cleared ${result.invoicesDeleted} invoice lines, ${result.contactsDeleted} contacts, and ${result.appointmentsDeleted} appointments.`,
    }
  } catch (err: any) {
    console.error('Analytics clear-data error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Failed to clear data' })
  }
})
