/**
 * Shared authentication helper for agent API endpoints.
 *
 * Uses the same Bearer-token pattern as other working admin APIs
 * (e.g., /api/admin/users) instead of the unreliable
 * serverSupabaseUser() approach.
 */

import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

interface AgentAuthResult {
  userId: string
  profileId: string
  role: string
}

/**
 * Authenticate the caller via Bearer token and verify admin role.
 * Throws 401 if not authenticated, 403 if not admin.
 */
export async function requireAgentAdmin(event: H3Event): Promise<AgentAuthResult> {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized - No token provided' })
  }

  const token = authHeader.substring(7)
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  // Verify caller's token
  const supabaseClient = createClient(supabaseUrl, supabaseKey || '')
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized - Invalid token' })
  }

  // Look up profile using admin client
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !hasRole(profile.role, ADMIN_ROLES)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  return {
    userId: user.id,
    profileId: profile.id,
    role: profile.role,
  }
}
