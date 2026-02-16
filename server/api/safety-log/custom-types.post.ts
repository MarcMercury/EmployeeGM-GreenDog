/**
 * POST /api/safety-log/custom-types
 * Create a new custom safety log type.
 * Only non-base users (everyone except 'user' role) can create.
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

  if (!body?.key || !body?.label || !body?.fields?.length) {
    throw createError({ statusCode: 400, message: 'key, label, and fields are required' })
  }

  // Insert custom type
  const { data, error } = await (client as any)
    .from('custom_safety_log_types')
    .insert({
      key: body.key,
      label: body.label,
      icon: body.icon || 'mdi-clipboard-text',
      color: body.color || 'grey',
      description: body.description || '',
      fields: body.fields,
      has_osha_toggle: body.has_osha_toggle || false,
      compliance_standards: body.compliance_standards || [],
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Seed schedule rows for all 3 locations
  const locations = ['venice', 'sherman_oaks', 'van_nuys']
  for (const loc of locations) {
    await (client as any)
      .from('safety_log_schedules')
      .upsert(
        { log_type: body.key, location: loc, cadence: 'none' },
        { onConflict: 'log_type,location' }
      )
  }

  return { data }
})
