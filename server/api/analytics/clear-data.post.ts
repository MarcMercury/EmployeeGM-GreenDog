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

  const result = { invoicesDeleted: 0, contactsDeleted: 0 }

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

    return {
      success: true,
      scope,
      ...result,
      message: `Cleared ${result.invoicesDeleted} invoice lines and ${result.contactsDeleted} contacts.`,
    }
  } catch (err: any) {
    console.error('Analytics clear-data error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Failed to clear data' })
  }
})
