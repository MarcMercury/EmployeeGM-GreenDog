/**
 * POST /api/safety-log/debug
 * Diagnostic endpoint — test insert without schema validation.
 * Remove after debugging.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const steps: string[] = []

  try {
    steps.push('1-auth-start')
    const user = await serverSupabaseUser(event)
    if (!user) {
      return { error: 'No user', steps }
    }
    steps.push(`2-auth-ok: ${user.id}`)

    steps.push('3-supabase-client')
    const supabase = await serverSupabaseServiceRole(event)
    steps.push('4-supabase-client-ok')

    steps.push('5-profile-lookup')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      return { error: `Profile lookup failed: ${profileError.message}`, code: profileError.code, steps }
    }
    if (!profile) {
      return { error: 'No profile found', steps }
    }
    steps.push(`6-profile-ok: ${profile.id} role=${profile.role}`)

    steps.push('7-read-body')
    const body = await readBody(event)
    steps.push(`8-body-ok: keys=${Object.keys(body || {}).join(',')}`)

    steps.push('9-insert')
    const insertPayload = {
      log_type: body?.log_type || 'safety_inspection',
      location: body?.location || 'venice',
      form_data: body?.form_data || { inspector: 'debug-test' },
      submitted_by: profile.id,
      status: 'submitted',
      osha_recordable: false,
      photo_urls: [],
    }
    steps.push(`10-payload: ${JSON.stringify(insertPayload).slice(0, 200)}`)

    const { data, error } = await supabase
      .from('safety_logs')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      return {
        error: `Insert failed: ${error.message}`,
        code: error.code,
        hint: error.hint,
        details: error.details,
        steps,
      }
    }

    steps.push(`11-insert-ok: ${data?.id}`)

    // Clean up test row
    if (data?.id) {
      await supabase.from('safety_logs').delete().eq('id', data.id)
      steps.push('12-cleanup-ok')
    }

    return { success: true, steps }
  } catch (err: any) {
    return {
      error: `Unexpected: ${err?.message || String(err)}`,
      stack: err?.stack?.split('\n').slice(0, 5),
      steps,
    }
  }
})
