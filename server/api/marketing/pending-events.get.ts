// =============================================================================
// API Endpoint: Get Pending Scraped Events
// GET /api/marketing/pending-events
// Retrieve events that were scraped but not yet approved/inserted
// =============================================================================

export default defineEventHandler(async (event) => {
  // Check authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // Check authorization
  const supabase = serverSupabaseClient(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'marketing_admin' || profile?.role === 'partner'

  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only marketing admins can view pending events',
    })
  }

  try {
    // Retrieve pending scraped events from cache/table
    const { data: pendingEvents, error } = await supabase
      .from('marketing_events')
      .select('*')
      .eq('status', 'pending')
      .order('event_date', { ascending: true })

    if (error) throw error

    return {
      success: true,
      count: pendingEvents?.length || 0,
      events: pendingEvents || [],
    }
  } catch (error) {
    console.error('Error fetching pending events:', error)

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to fetch pending events',
    })
  }
})
