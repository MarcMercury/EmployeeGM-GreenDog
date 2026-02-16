/**
 * PUT /api/safety-log/custom-types
 * Update an existing custom safety log type.
 * Body: { id, label?, icon?, color?, description?, fields?, has_osha_toggle?, compliance_standards?, is_active? }
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)

  // Verify non-base role
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
  if (!profile || !allowedRoles.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const body = await readBody(event)
  if (!body?.id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updatePayload: Record<string, unknown> = {}
  if (body.label !== undefined) updatePayload.label = body.label
  if (body.icon !== undefined) updatePayload.icon = body.icon
  if (body.color !== undefined) updatePayload.color = body.color
  if (body.description !== undefined) updatePayload.description = body.description
  if (body.fields !== undefined) updatePayload.fields = body.fields
  if (body.has_osha_toggle !== undefined) updatePayload.has_osha_toggle = body.has_osha_toggle
  if (body.compliance_standards !== undefined) updatePayload.compliance_standards = body.compliance_standards
  if (body.is_active !== undefined) updatePayload.is_active = body.is_active

  const { data, error } = await (client as any)
    .from('custom_safety_log_types')
    .update(updatePayload)
    .eq('id', body.id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data }
})
