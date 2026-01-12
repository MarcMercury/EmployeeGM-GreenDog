/**
 * Email utility using Resend
 * Handles all outgoing email for the Unified User Lifecycle system
 */

import { Resend } from 'resend'

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender configuration
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Green Dog Veterinary <noreply@greendog.vet>'
const APP_URL = process.env.APP_URL || 'https://employeegm.greendog.vet'

export interface IntakeEmailOptions {
  to: string
  firstName?: string
  lastName?: string
  linkType: string
  token: string
  expiresAt: Date
  customMessage?: string
  targetPositionTitle?: string
  targetClinicName?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Get the subject line based on link type
 */
function getSubjectLine(linkType: string, firstName?: string): string {
  const name = firstName ? `, ${firstName}` : ''
  
  switch (linkType) {
    case 'job_application':
      return `Complete Your Job Application${name} - Green Dog Veterinary`
    case 'student_enrollment':
      return `GDU Enrollment Form${name} - Complete Your Registration`
    case 'externship_signup':
      return `Externship Application${name} - Green Dog University`
    case 'general_intake':
      return `Welcome${name} - Green Dog Veterinary Information Request`
    case 'referral_partner':
      return `Partner Referral Program${name} - Green Dog Veterinary`
    case 'event_registration':
      return `Event Registration${name} - Green Dog Veterinary`
    default:
      return `Action Required${name} - Green Dog Veterinary`
  }
}

/**
 * Get the email body based on link type
 */
function getEmailBody(options: IntakeEmailOptions): string {
  const { firstName, lastName, linkType, token, expiresAt, customMessage, targetPositionTitle, targetClinicName } = options
  const name = firstName || 'there'
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || ''
  const intakeUrl = `${APP_URL}/intake/${token}`
  const expiresFormatted = new Date(expiresAt).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  let intro = ''
  let ctaText = ''
  let additionalInfo = ''

  switch (linkType) {
    case 'job_application':
      intro = `We're excited about your interest in joining the Green Dog Veterinary team!`
      if (targetPositionTitle) {
        intro += ` We'd love to learn more about you for the <strong>${targetPositionTitle}</strong> position`
        if (targetClinicName) intro += ` at <strong>${targetClinicName}</strong>`
        intro += '.'
      }
      ctaText = 'Complete Your Application'
      additionalInfo = 'Please fill out all required fields to ensure your application is considered.'
      break
    
    case 'student_enrollment':
      intro = `Welcome to Green Dog University! We're thrilled to have you join our educational program.`
      ctaText = 'Complete Enrollment'
      additionalInfo = 'Please have your educational history and contact information ready.'
      break
    
    case 'externship_signup':
      intro = `Thank you for your interest in our externship program at Green Dog University!`
      ctaText = 'Apply for Externship'
      additionalInfo = 'Please include your academic information and any relevant experience.'
      break
    
    case 'general_intake':
      intro = `Thank you for reaching out to Green Dog Veterinary! We'd love to learn more about how we can help you.`
      ctaText = 'Complete Form'
      break
    
    case 'referral_partner':
      intro = `We're excited about the opportunity to partner with you! Please complete the following form to get started.`
      ctaText = 'Start Partnership Application'
      break
    
    case 'event_registration':
      intro = `You're invited! Please register for our upcoming event by completing the form below.`
      ctaText = 'Register Now'
      break
    
    default:
      intro = `Please complete the following form to continue.`
      ctaText = 'Complete Form'
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getSubjectLine(linkType, firstName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #22c55e; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🐕 Green Dog Veterinary
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Hello${name ? `, ${name}` : ''}!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${intro}
              </p>
              
              ${customMessage ? `
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px 20px; margin: 20px 0;">
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                  ${customMessage}
                </p>
              </div>
              ` : ''}
              
              ${additionalInfo ? `
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                ${additionalInfo}
              </p>
              ` : ''}
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${intakeUrl}" 
                       style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Link expires notice -->
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                This link expires on <strong>${expiresFormatted}</strong>
              </p>
              
              <!-- Fallback URL -->
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="${intakeUrl}" style="color: #22c55e; word-break: break-all;">${intakeUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                Green Dog Veterinary
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Green Dog Veterinary. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Send an intake link email
 */
export async function sendIntakeLinkEmail(options: IntakeEmailOptions): Promise<EmailResult> {
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - email will not be sent')
    return {
      success: false,
      error: 'Email service not configured. Set RESEND_API_KEY environment variable.'
    }
  }

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM,
      to: options.to,
      subject: getSubjectLine(options.linkType, options.firstName),
      html: getEmailBody(options),
    })

    if (result.error) {
      console.error('Resend error:', result.error)
      return {
        success: false,
        error: result.error.message
      }
    }

    return {
      success: true,
      messageId: result.data?.id
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send a batch of intake link emails
 */
export async function sendBatchIntakeEmails(
  emails: IntakeEmailOptions[]
): Promise<{ sent: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = []
  let sent = 0
  let failed = 0

  for (const email of emails) {
    const result = await sendIntakeLinkEmail(email)
    results.push(result)
    if (result.success) sent++
    else failed++
  }

  return { sent, failed, results }
}

/**
 * Send a simple notification email
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: 'Email service not configured'
    }
  }

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Green Dog Veterinary</h2>
          ${body}
        </div>
      `
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, messageId: result.data?.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
