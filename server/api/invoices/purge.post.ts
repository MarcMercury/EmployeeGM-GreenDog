/**
 * Invoice Purge API
 *
 * POST /api/invoices/purge
 *
 * Manually triggers purge of invoice lines older than 24 months.
 * Also available as auto-purge during uploads.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth
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
    throw createError({ statusCode: 403, message: 'Super admin access required for data purge' })
  }

  try {
    const { data: purged, error } = await supabase.rpc('purge_old_invoice_lines')
    if (error) throw error

    return {
      success: true,
      purgedCount: purged || 0,
      message: `Purged ${purged || 0} invoice lines older than 24 months.`,
    }
  } catch (err: any) {
    console.error('Purge error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Purge failed' })
  }
})
