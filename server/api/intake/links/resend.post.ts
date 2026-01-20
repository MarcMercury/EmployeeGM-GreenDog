/**
 * POST /api/intake/links/resend
 * 
 * Resends the intake invitation email for an existing link.
 * Admin only endpoint.
 * 
 * Body: {
 *   linkId: string (UUID of the intake_link)
 *   customMessage?: string (optional additional message)
 * }
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createAdminClient, verifyAdminAccess } from '../../../utils/intake'
import { sendIntakeLinkEmail } from '../../../utils/email'

interface ResendBody {
  linkId: string
  customMessage?: string
}

export default defineEventHandler(async (event) => {
  // Verify admin access
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)
  const { isAdmin, profileId } = await verifyAdminAccess(client, user.id)
  
  if (!isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const body = await readBody<ResendBody>(event)

  if (!body.linkId) {
    throw createError({ statusCode: 400, statusMessage: 'linkId is required' })
  }

  // Get the link details
  const adminClient = createAdminClient()
  const { data: link, error } = await adminClient
    .from('intake_links')
    .select(`
      *,
      target_position:positions(id, title),
      target_location:locations(id, name)
    `)
    .eq('id', body.linkId)
    .single()

  if (error || !link) {
    throw createError({ statusCode: 404, statusMessage: 'Intake link not found' })
  }

  // Check if link has an email to send to
  if (!link.prefill_email) {
    throw createError({ statusCode: 400, statusMessage: 'No email address associated with this link' })
  }

  // Check if link is expired
  if (new Date(link.expires_at) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Link has expired. Create a new link instead.' })
  }

  // Check if link is already completed
  if (link.status === 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Link has already been completed' })
  }

  // Send the email
  const baseUrl = getAppUrl()
  
  const emailResult = await sendIntakeLinkEmail({
    to: link.prefill_email,
    firstName: link.prefill_first_name,
    lastName: link.prefill_last_name,
    linkType: link.link_type,
    token: link.token,
    expiresAt: new Date(link.expires_at),
    customMessage: body.customMessage,
    targetPositionTitle: link.target_position?.title,
    targetClinicName: link.target_location?.name
  })

  if (!emailResult.success) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Failed to send email: ${emailResult.error}` 
    })
  }

  // Update link status
  await adminClient
    .from('intake_links')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: profileId
    })
    .eq('id', link.id)

  return {
    success: true,
    data: {
      linkId: link.id,
      email: link.prefill_email,
      messageId: emailResult.messageId
    }
  }
})
