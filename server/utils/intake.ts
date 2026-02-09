/**
 * Server utilities for the Unified User Lifecycle system
 * Provides helper functions for intake processing and authentication
 */

import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * Create a Supabase admin client with service role key
 * This bypasses RLS for admin operations
 */
export function createAdminClient() {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create a Supabase client with the user's token
 */
export function createUserClient(token: string) {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

/**
 * Verify if the calling user is an admin
 */
export async function verifyAdminAccess(event: H3Event): Promise<{ userId: string; profileId: string }> {
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No token provided'
    })
  }

  const token = authHeader.substring(7)
  const adminClient = createAdminClient()
  const userClient = createUserClient(token)

  // Verify the token
  const { data: { user }, error: authError } = await userClient.auth.getUser()

  if (authError || !user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Invalid token'
    })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - No profile found'
    })
  }

  if (!['admin', 'super_admin'].includes(profile.role)) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required'
    })
  }

  return {
    userId: user.id,
    profileId: profile.id
  }
}

/**
 * Get request origin for CORS validation
 */
export function getRequestOrigin(event: H3Event): string | null {
  return getHeader(event, 'origin') || getHeader(event, 'referer') || null
}

/**
 * Standard error response for intake APIs
 */
export function intakeError(statusCode: number, message: string, details?: unknown) {
  return createError({
    statusCode,
    message,
    data: details
  })
}
