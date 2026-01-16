/**
 * GET /api/admin/pending-audit
 * 
 * Audits all pending user accounts for data integrity issues
 * Only super_admin can access this endpoint
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Verify authorization header
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error - missing Supabase credentials'
    })
  }

  // Create regular client to verify the calling user
  const supabaseClient = createClient(supabaseUrl, config.public.supabaseKey || process.env.NUXT_PUBLIC_SUPABASE_KEY || '')
  
  // Verify the caller's token
  const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)
  
  if (authError || !callerUser) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Check if caller is super_admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || callerProfile?.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Super Admin access required'
    })
  }

  try {
    // Get all pending employees
    const { data: pendingEmployees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email_work,
        email_personal,
        employment_status,
        needs_user_account,
        profile_id,
        profiles:profile_id(id, auth_user_id, email, role)
      `)
      .eq('needs_user_account', true)
      .eq('employment_status', 'active')

    if (empError) throw empError

    // Get all auth users
    const { data: { users: authUsers }, error: authFetchError } = await supabaseAdmin.auth.admin.listUsers()
    if (authFetchError) throw authFetchError

    // Get all profiles with auth_user_id
    const { data: linkedProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, email, first_name, last_name')
      .not('auth_user_id', 'is', null)

    const authUserMap = new Map(authUsers?.map(u => [u.email?.toLowerCase(), u]) || [])
    const authUserIdToProfile = new Map(linkedProfiles?.map(p => [p.auth_user_id, p]) || [])

    const results: Array<{
      name: string
      employee_id: string
      profile_id: string
      email_work: string | null
      email_personal: string | null
      status: 'clean' | 'orphan' | 'issue'
      issue?: string
      fix?: string
    }> = []

    for (const emp of pendingEmployees || []) {
      const name = `${emp.first_name} ${emp.last_name}`
      const profile = emp.profiles as any
      const workEmail = emp.email_work?.toLowerCase()
      const personalEmail = emp.email_personal?.toLowerCase()

      // Check if profile already has auth_user_id
      if (profile?.auth_user_id) {
        results.push({
          name,
          employee_id: emp.id,
          profile_id: emp.profile_id,
          email_work: emp.email_work,
          email_personal: emp.email_personal,
          status: 'issue',
          issue: 'Profile already has auth_user_id but needs_user_account=true',
          fix: `Set needs_user_account=false for employee ${emp.id}`
        })
        continue
      }

      // Check if work email exists in auth
      const authUserWork = workEmail ? authUserMap.get(workEmail) : null
      const authUserPersonal = personalEmail ? authUserMap.get(personalEmail) : null

      if (authUserWork) {
        const linkedTo = authUserIdToProfile.get(authUserWork.id)
        if (linkedTo) {
          const linkedName = `${linkedTo.first_name || ''} ${linkedTo.last_name || ''}`.trim() || linkedTo.email
          results.push({
            name,
            employee_id: emp.id,
            profile_id: emp.profile_id,
            email_work: emp.email_work,
            email_personal: emp.email_personal,
            status: 'issue',
            issue: `Work email already used by: ${linkedName}`,
            fix: 'Use a different email or merge records'
          })
        } else {
          results.push({
            name,
            employee_id: emp.id,
            profile_id: emp.profile_id,
            email_work: emp.email_work,
            email_personal: emp.email_personal,
            status: 'orphan',
            issue: 'Work email has orphaned auth user (will auto-link on create)'
          })
        }
      } else if (authUserPersonal) {
        const linkedTo = authUserIdToProfile.get(authUserPersonal.id)
        if (linkedTo) {
          const linkedName = `${linkedTo.first_name || ''} ${linkedTo.last_name || ''}`.trim() || linkedTo.email
          results.push({
            name,
            employee_id: emp.id,
            profile_id: emp.profile_id,
            email_work: emp.email_work,
            email_personal: emp.email_personal,
            status: 'issue',
            issue: `Personal email already used by: ${linkedName}`,
            fix: 'Use a different email or merge records'
          })
        } else {
          results.push({
            name,
            employee_id: emp.id,
            profile_id: emp.profile_id,
            email_work: emp.email_work,
            email_personal: emp.email_personal,
            status: 'orphan',
            issue: 'Personal email has orphaned auth user (will auto-link on create)'
          })
        }
      } else {
        results.push({
          name,
          employee_id: emp.id,
          profile_id: emp.profile_id,
          email_work: emp.email_work,
          email_personal: emp.email_personal,
          status: 'clean'
        })
      }
    }

    const summary = {
      total: results.length,
      clean: results.filter(r => r.status === 'clean').length,
      orphan: results.filter(r => r.status === 'orphan').length,
      issues: results.filter(r => r.status === 'issue').length
    }

    return {
      success: true,
      summary,
      results
    }
  } catch (error) {
    console.error('[Pending Audit API] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to audit pending users'
    })
  }
})
