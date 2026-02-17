/**
 * PUT /api/safety-log/schedules
 * Bulk-update cadence for one or more schedule rows.
 * Body: { updates: [{ log_type, location, cadence }] }
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)

  // Verify manager+ role
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  const managerRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
  if (!profile || !managerRoles.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Manager+ role required' })
  }

  const body = await readBody(event)
  const updates = body?.updates
  if (!Array.isArray(updates) || updates.length === 0) {
    throw createError({ statusCode: 400, message: 'updates array required' })
  }

  const validCadences = ['monthly', 'quarterly', 'biannual', 'annual', 'none']
  const results = []

  for (const u of updates) {
    if (!u.log_type || !u.location || !validCadences.includes(u.cadence)) {
      results.push({ ...u, error: 'Invalid fields' })
      continue
    }

    const { data, error } = await (client as any)
      .from('safety_log_schedules')
      .update({ cadence: u.cadence })
      .eq('log_type', u.log_type)
      .eq('location', u.location)
      .select()
      .single()

    if (error) {
      results.push({ ...u, error: error.message })
    } else {
      results.push(data)
    }
  }

  return { updated: results.length, results }
})
