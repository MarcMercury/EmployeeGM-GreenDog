/**
 * POST /api/intake/form/[token]
 * 
 * PUBLIC ENDPOINT - Submits form data for a given intake token.
 * This creates the intake_submission record and triggers processing.
 * 
 * Body: Form data as JSON object matching the form configuration
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required'
    })
  }

  // Get form data from request body
  const formData = await readBody(event)

  if (!formData || typeof formData !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Form data is required'
    })
  }

  // Get request metadata for security
  const clientIP = getHeader(event, 'x-forwarded-for')?.split(',')[0] || 
                   getHeader(event, 'x-real-ip') ||
                   event.node.req.socket?.remoteAddress || 
                   null
  const userAgent = getHeader(event, 'user-agent') || null

  // Create service role client for database operations
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  // Verify the intake link exists and is valid
  const { data: link, error: linkError } = await adminClient
    .from('intake_links')
    .select('id, token, link_type, status, expires_at')
    .eq('token', token)
    .single()

  if (linkError || !link) {
    throw createError({
      statusCode: 404,
      message: 'Invalid or expired link'
    })
  }

  // Validate link status
  if (new Date(link.expires_at) < new Date()) {
    throw createError({
      statusCode: 410,
      message: 'This link has expired'
    })
  }

  if (link.status === 'completed') {
    throw createError({
      statusCode: 410,
      message: 'This form has already been submitted'
    })
  }

  if (link.status === 'revoked') {
    throw createError({
      statusCode: 410,
      message: 'This link is no longer valid'
    })
  }

  // Validate required email field
  const email = formData.email || formData.prefill_email
  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format'
    })
  }

  // Validate required name fields
  const firstName = formData.first_name || formData.firstName
  const lastName = formData.last_name || formData.lastName
  
  if (!firstName || !lastName) {
    throw createError({
      statusCode: 400,
      message: 'First name and last name are required'
    })
  }

  // Create the submission record
  const { data: submission, error: submissionError } = await adminClient
    .from('intake_submissions')
    .insert({
      intake_link_id: link.id,
      form_data: formData,
      ip_address: clientIP,
      user_agent: userAgent,
      processing_status: 'pending'
    })
    .select('id')
    .single()

  if (submissionError) {
    console.error('Error creating submission:', submissionError)
    throw createError({
      statusCode: 500,
      message: 'Failed to submit form'
    })
  }

  // Process the submission immediately using the database function
  try {
    const { data: personId, error: processError } = await adminClient
      .rpc('process_intake_submission', {
        p_submission_id: submission.id
      })

    if (processError) {
      console.error('Error processing submission:', processError)
      // Don't fail the request - mark as needs_review
      await adminClient
        .from('intake_submissions')
        .update({
          processing_status: 'needs_review',
          processing_error: processError.message
        })
        .eq('id', submission.id)
    }

    return {
      success: true,
      message: getSuccessMessage(link.link_type),
      data: {
        submissionId: submission.id,
        processed: !processError,
        personId: personId || null
      }
    }
  } catch (err) {
    console.error('Processing error:', err)
    
    // Update submission to needs_review
    await adminClient
      .from('intake_submissions')
      .update({
        processing_status: 'needs_review',
        processing_error: err instanceof Error ? err.message : 'Unknown error'
      })
      .eq('id', submission.id)

    // Still return success to the user - we received their data
    return {
      success: true,
      message: getSuccessMessage(link.link_type),
      data: {
        submissionId: submission.id,
        processed: false,
        personId: null
      }
    }
  }
})

/**
 * Get a user-friendly success message based on link type
 */
function getSuccessMessage(linkType: string): string {
  const messages: Record<string, string> = {
    job_application: 'Thank you for your application! Our team will review it and contact you soon.',
    student_enrollment: 'Thank you for enrolling! We will be in touch with next steps.',
    externship_signup: 'Thank you for your externship application! We will contact you to discuss your placement.',
    general_intake: 'Thank you for contacting us! We will respond shortly.',
    referral_partner: 'Thank you for your partnership interest! Our team will reach out soon.',
    event_registration: 'Thank you for registering! You will receive confirmation details via email.'
  }
  return messages[linkType] || 'Thank you for your submission!'
}
