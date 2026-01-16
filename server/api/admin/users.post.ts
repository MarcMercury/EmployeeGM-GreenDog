/**
 * POST /api/admin/users
 * 
 * Creates a new user account (auth user + profile link)
 * Only admin roles can access this endpoint
 */

import { createClient } from '@supabase/supabase-js'

interface CreateUserRequest {
  email: string
  password: string
  role: string
  phone?: string
  first_name: string
  last_name: string
  profile_id: string
  employee_id: string
  location_id?: string
}

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

  // Get request body
  const body = await readBody<CreateUserRequest>(event)
  
  if (!body.email || !body.password || !body.role || !body.profile_id || !body.employee_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: email, password, role, profile_id, employee_id'
    })
  }

  // Get Supabase configuration
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Admin Create User API] Missing credentials:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey
    })
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

  // Check if caller is admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', callerUser.id)
    .single()

  if (profileError || !callerProfile) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Profile not found'
    })
  }

  const adminRoles = ['admin', 'super_admin', 'hr_admin']
  if (!adminRoles.includes(callerProfile.role)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required'
    })
  }

  try {
    // Check if profile already has an auth_user_id linked
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id, first_name, last_name, email')
      .eq('id', body.profile_id)
      .single()

    if (existingProfile?.auth_user_id) {
      throw createError({
        statusCode: 400,
        message: 'This profile already has a user account linked. Please edit the existing user instead.'
      })
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === body.email.toLowerCase())
    
    if (existingAuthUser) {
      // Check if this auth user is linked to another profile
      const { data: linkedProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('auth_user_id', existingAuthUser.id)
        .single()
      
      if (linkedProfile) {
        const linkedName = `${linkedProfile.first_name || ''} ${linkedProfile.last_name || ''}`.trim() || linkedProfile.email
        throw createError({
          statusCode: 400,
          message: `The email "${body.email}" is already used by another account (${linkedName}). Please use a different email address.`
        })
      } else {
        // Auth user exists but not linked to any profile - we can link it!
        console.log(`[Admin Create User API] Found orphaned auth user for ${body.email}, linking to profile`)
        
        // Link existing auth user to this profile
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            auth_user_id: existingAuthUser.id,
            role: body.role,
            phone: body.phone || null
          })
          .eq('id', body.profile_id)

        if (profileUpdateError) {
          console.error('[Admin Create User API] Profile update error:', profileUpdateError)
          throw createError({
            statusCode: 500,
            message: `Failed to link existing auth user: ${profileUpdateError.message}`
          })
        }

        // Update employee record
        const employeeUpdate: Record<string, unknown> = {
          needs_user_account: false,
          user_created_at: new Date().toISOString(),
          onboarding_status: 'completed'
        }
        
        if (body.location_id) {
          employeeUpdate.location_id = body.location_id
        }

        await supabaseAdmin
          .from('employees')
          .update(employeeUpdate)
          .eq('id', body.employee_id)

        // Add system note
        await supabaseAdmin.from('employee_notes').insert({
          employee_id: body.employee_id,
          note: `Linked existing user account (${body.email}) with role: ${body.role}`,
          note_type: 'system',
          hr_only: true
        })

        return {
          success: true,
          linked: true,
          user: {
            id: existingAuthUser.id,
            email: existingAuthUser.email
          },
          message: 'Linked existing auth user to profile'
        }
      }
    }

    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name
      }
    })

    if (createAuthError) {
      console.error('[Admin Create User API] Auth creation error:', createAuthError)
      throw createError({
        statusCode: 400,
        message: `Failed to create auth user: ${createAuthError.message}`
      })
    }

    // 2. Update profile with auth_user_id and role
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        auth_user_id: authData.user.id,
        role: body.role,
        phone: body.phone || null
      })
      .eq('id', body.profile_id)

    if (profileUpdateError) {
      console.error('[Admin Create User API] Profile update error:', profileUpdateError)
      // Try to clean up the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 500,
        message: `Failed to update profile: ${profileUpdateError.message}`
      })
    }

    // 3. Update employee record
    const employeeUpdate: Record<string, unknown> = {
      needs_user_account: false,
      user_created_at: new Date().toISOString(),
      onboarding_status: 'completed'
    }
    
    if (body.location_id) {
      employeeUpdate.location_id = body.location_id
    }

    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update(employeeUpdate)
      .eq('id', body.employee_id)

    if (empError) {
      console.error('[Admin Create User API] Employee update error:', empError)
      // Non-fatal - user was created successfully
    }

    // 4. Add system note
    await supabaseAdmin.from('employee_notes').insert({
      employee_id: body.employee_id,
      note: `User account created with role: ${body.role}. Email: ${body.email}`,
      note_type: 'system',
      hr_only: true
    })

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    }
  } catch (error: unknown) {
    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    console.error('[Admin Create User API] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to create user'
    })
  }
})
