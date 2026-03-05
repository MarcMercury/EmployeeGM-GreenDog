/**
 * Shared server-side auth + role verification utility.
 *
 * Eliminates the duplicated ~15-line auth boilerplate from every API handler.
 * Returns the authenticated user, their profile, and a service-role Supabase client.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import type { UserRole } from './roles'

interface AuthResult {
  user: { id: string; [key: string]: any }
  profile: { id: string; role: UserRole; [key: string]: any }
  supabase: any
}

export async function requireRole(event: H3Event, roles: readonly UserRole[] | UserRole[]): Promise<AuthResult> {
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !roles.includes(profile.role as UserRole)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  return { user, profile, supabase }
}
