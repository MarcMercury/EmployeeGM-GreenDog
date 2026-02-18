/**
 * PUT /api/safety-log/:id
 * Update a safety log (review, flag, edit).
 * Managers+ can update any log; users can only update their own drafts.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { SafetyLogUpdateSchema } from '~/schemas/safety-log'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 400, message: 'Valid Log ID (UUID) is required' })
  }

  const body = await readBody(event)
  const parsed = SafetyLogUpdateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Resolve the caller's profile and role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

  if (!profile) {
    throw createError({ statusCode: 403, message: 'Profile not found' })
  }

  const isManager = MANAGER_ROLES.includes(profile.role)

  // Fetch the existing log to verify ownership
  const { data: existingLog, error: fetchErr } = await supabase
    .from('safety_logs')
    .select('submitted_by, status')
    .eq('id', id)
    .single()

  if (fetchErr || !existingLog) {
    throw createError({ statusCode: 404, message: 'Safety log not found' })
  }

  // Non-managers can only update their own drafts
  if (!isManager) {
    if (existingLog.submitted_by !== profile.id) {
      throw createError({ statusCode: 403, message: 'You can only edit your own logs' })
    }
    if (existingLog.status !== 'draft') {
      throw createError({ statusCode: 403, message: 'Only draft logs can be edited' })
    }
    // Non-managers cannot change status to reviewed or set reviewed_by
    if (parsed.data.status === 'reviewed' || parsed.data.reviewed_by) {
      throw createError({ statusCode: 403, message: 'Only managers can review logs' })
    }
  }

  const { data, error } = await supabase
    .from('safety_logs')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
