/**
 * POST /api/intake/links
 * 
 * Creates a new intake link for external data collection.
 * Admin only endpoint.
 * 
 * Body: {
 *   linkType: 'job_application' | 'student_enrollment' | 'externship_signup' | 'general_intake' | 'referral_partner' | 'event_registration'
 *   prefillEmail?: string
 *   prefillFirstName?: string
 *   prefillLastName?: string
 *   targetPositionId?: string
 *   targetDepartmentId?: string
 *   targetLocationId?: string
 *   targetEventId?: string
 *   expiresInDays?: number (default: 7)
 *   internalNotes?: string
 *   sendEmail?: boolean (if true, sends invitation email)
 * }
 */

import { createAdminClient, verifyAdminAccess } from '../../utils/intake'
import { sendIntakeLinkEmail } from '../../utils/email'

interface CreateLinkBody {
  linkType: string
  prefillEmail?: string
  prefillFirstName?: string
  prefillLastName?: string
  targetPositionId?: string
  targetDepartmentId?: string
  targetLocationId?: string
  targetEventId?: string
  expiresInDays?: number
  internalNotes?: string
  sendEmail?: boolean
}

export default defineEventHandler(async (event) => {
  // Verify admin access
  const { profileId } = await verifyAdminAccess(event)

  // Get request body
  const body = await readBody<CreateLinkBody>(event)

  // Validate required fields
  const validLinkTypes = [
    'job_application',
    'student_enrollment',
    'externship_signup',
    'general_intake',
    'referral_partner',
    'event_registration'
  ]

  if (!body.linkType || !validLinkTypes.includes(body.linkType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid linkType. Must be one of: ${validLinkTypes.join(', ')}`
    })
  }

  const adminClient = createAdminClient()

  // Create the intake link using the database function
  const { data: linkResult, error: createError } = await adminClient
    .rpc('create_intake_link', {
      p_link_type: body.linkType,
      p_prefill_email: body.prefillEmail || null,
      p_prefill_first_name: body.prefillFirstName || null,
      p_prefill_last_name: body.prefillLastName || null,
      p_target_position_id: body.targetPositionId || null,
      p_target_department_id: body.targetDepartmentId || null,
      p_target_location_id: body.targetLocationId || null,
      p_target_event_id: body.targetEventId || null,
      p_expires_in_days: body.expiresInDays || 7,
      p_internal_notes: body.internalNotes || null
    })

  if (createError) {
    console.error('Error creating intake link:', createError)
    throw createError({
      statusCode: 500,
      message: 'Failed to create intake link'
    })
  }

  // Get full link details
  const { data: link, error: fetchError } = await adminClient
    .from('intake_links')
    .select(`
      *,
      target_position:job_positions(id, title),
      target_department:departments(id, name),
      target_location:locations(id, name)
    `)
    .eq('id', linkResult[0].id)
    .single()

  if (fetchError) {
    console.error('Error fetching link details:', fetchError)
  }

  // Generate the full URL
  const baseUrl = getAppUrl()
  const intakeUrl = `${baseUrl}/intake/${link?.token || linkResult[0].token}`

  // If sendEmail is true and we have an email, send the invitation
  let emailSent = false
  let emailError: string | undefined
  
  if (body.sendEmail && body.prefillEmail) {
    // Send the email via Resend
    const emailResult = await sendIntakeLinkEmail({
      to: body.prefillEmail,
      firstName: body.prefillFirstName,
      lastName: body.prefillLastName,
      linkType: body.linkType,
      token: link?.token || linkResult[0].token,
      expiresAt: new Date(linkResult[0].expires_at),
      targetPositionTitle: link?.target_position?.title,
      targetClinicName: link?.target_location?.name
    })
    
    emailSent = emailResult.success
    emailError = emailResult.error
    
    // Update link status
    await adminClient
      .from('intake_links')
      .update({
        status: emailResult.success ? 'sent' : 'pending',
        sent_at: emailResult.success ? new Date().toISOString() : null,
        sent_by: profileId
      })
      .eq('id', linkResult[0].id)
    
    if (!emailResult.success) {
      console.warn(`[Intake] Failed to send email to ${body.prefillEmail}: ${emailResult.error}`)
    } else {
      console.log(`[Intake] Email sent to ${body.prefillEmail} (ID: ${emailResult.messageId})`)
    }
  }

  return {
    success: true,
    data: {
      id: linkResult[0].id,
      token: linkResult[0].token,
      linkType: body.linkType,
      expiresAt: linkResult[0].expires_at,
      url: intakeUrl,
      prefill: {
        email: body.prefillEmail,
        firstName: body.prefillFirstName,
        lastName: body.prefillLastName
      },
      target: {
        position: link?.target_position,
        department: link?.target_department,
        location: link?.target_location
      },
      emailSent,
      emailError
    }
  }
})
