/**
 * Undo a single referral upload — selective rollback.
 *
 * Deletes all referral_revenue_line_items rows tagged with the given upload_id
 * and recomputes partner totals so the dashboard reflects the rollback.
 * Marks the matching referral_sync_history row as undone (audit trail preserved).
 *
 * Allowed roles: super_admin, admin, marketing_admin.
 * If no upload_id is supplied, the most recent revenue upload is undone.
 */
import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabaseAdmin = await serverSupabaseServiceRole(event)
  const authHeader = event.headers.get('authorization')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No authorization header' })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) throw createError({ statusCode: 401, message: 'Invalid or expired session' })

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (profileError) throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })

  const allowedRoles = ['super_admin', 'admin', 'marketing_admin']
  if (!profile || !allowedRoles.includes(profile.role)) {
    throw createError({ statusCode: 403, message: `Admin or Marketing Admin access required. Your role: ${profile?.role || 'unknown'}` })
  }

  const body = await readBody<{ upload_id?: string }>(event).catch(() => ({}))
  let uploadId = body?.upload_id

  // Default: most recent revenue upload that hasn't already been undone.
  if (!uploadId) {
    const { data: latest, error: latestErr } = await supabaseAdmin
      .from('referral_sync_history')
      .select('id, filename, created_at, sync_details')
      .eq('report_type', 'revenue')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw createError({ statusCode: 500, message: latestErr.message })
    if (!latest) throw createError({ statusCode: 404, message: 'No revenue uploads found to undo' })
    if (latest.sync_details && (latest.sync_details as any).undone_at) {
      throw createError({ statusCode: 409, message: 'The most recent upload has already been undone' })
    }
    uploadId = latest.id
  }

  const { data, error } = await supabaseAdmin.rpc('undo_referral_upload', { p_upload_id: uploadId })
  if (error) throw createError({ statusCode: 500, message: error.message })

  const row = Array.isArray(data) ? data[0] : data
  const rowsDeleted = row?.rows_deleted ?? 0

  return {
    success: true,
    uploadId,
    rowsDeleted,
    message: rowsDeleted > 0
      ? `Removed ${rowsDeleted.toLocaleString()} line item${rowsDeleted === 1 ? '' : 's'} from upload`
      : 'Upload had no ledger rows to remove (likely a statistics upload).',
  }
})
