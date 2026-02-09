/**
 * GET /api/intake/links
 * 
 * Lists all intake links with optional filtering.
 * Admin only endpoint.
 * 
 * Query params:
 *   status?: 'pending' | 'sent' | 'opened' | 'completed' | 'expired' | 'revoked'
 *   linkType?: string
 *   limit?: number (default: 50)
 *   offset?: number (default: 0)
 */

import { createAdminClient, verifyAdminAccess } from '../../utils/intake'

export default defineEventHandler(async (event) => {
  // Verify admin access
  await verifyAdminAccess(event)

  // Get query params
  const query = getQuery(event)
  const status = query.status as string | undefined
  const linkType = query.linkType as string | undefined
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  const adminClient = createAdminClient()

  // Build query
  let dbQuery = adminClient
    .from('intake_links')
    .select(`
      *,
      target_position:job_positions(id, title),
      target_department:departments(id, name),
      target_location:locations(id, name),
      created_by_profile:profiles!intake_links_created_by_fkey(id, first_name, last_name),
      sent_by_profile:profiles!intake_links_sent_by_fkey(id, first_name, last_name),
      resulting_person:unified_persons(id, first_name, last_name, email, current_stage)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    dbQuery = dbQuery.eq('status', status)
  }

  if (linkType) {
    dbQuery = dbQuery.eq('link_type', linkType)
  }

  const { data: links, error, count } = await dbQuery

  if (error) {
    logger.error('Error fetching intake links', error, 'intake/links')
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch intake links'
    })
  }

  // Generate full URLs for each link
  const baseUrl = getAppUrl()

  const linksWithUrls = links?.map(link => ({
    ...link,
    url: `${baseUrl}/intake/${link.token}`,
    isExpired: new Date(link.expires_at) < new Date()
  })) || []

  return {
    success: true,
    data: linksWithUrls,
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0)
    }
  }
})
