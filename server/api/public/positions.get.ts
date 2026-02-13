/**
 * GET /api/public/positions
 * 
 * PUBLIC ENDPOINT - Returns active job positions for the careers page.
 * No authentication required.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Use anon key for public endpoints — respects RLS policies
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)

  try {
    const { data, error } = await anonClient
      .from('job_positions')
      .select(`
        id,
        title,
        description,
        employment_type,
        is_active,
        department:department_id(name),
        location:location_id(name)
      `)
      .eq('is_active', true)
      .order('title')

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (err) {
    logger.error('Error fetching positions', err instanceof Error ? err : null, 'public/positions')
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch positions'
    })
  }
})
