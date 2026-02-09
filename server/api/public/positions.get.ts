/**
 * GET /api/public/positions
 * 
 * PUBLIC ENDPOINT - Returns active job positions for the careers page.
 * No authentication required.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Create service role client for database operations
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data, error } = await adminClient
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
