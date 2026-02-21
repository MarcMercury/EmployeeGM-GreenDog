/**
 * Extract the auth user UUID from the object returned by serverSupabaseUser().
 *
 * Depending on the @nuxtjs/supabase version the shape varies:
 *   v1 / older v2: returns a User object  → user.id
 *   newer v2+:     returns JWT claims     → user.sub
 *
 * This helper normalises both so callers can just do:
 *   const userId = getUserId(user)
 */
export function getUserId(user: Record<string, any>): string {
  // Try .id first (classic User object), then .sub (JWT claims)
  const id = user?.id ?? user?.sub
  if (!id || typeof id !== 'string') {
    throw createError({
      statusCode: 401,
      message: 'Unable to determine user ID from auth token',
    })
  }
  return id
}
