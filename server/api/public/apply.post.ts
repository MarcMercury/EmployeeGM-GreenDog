/**
 * POST /api/public/apply
 * 
 * PUBLIC ENDPOINT - Submits a job application directly to the recruiting CRM.
 * Creates a candidate record in the database.
 * No authentication required.
 * 
 * Rate limited: 5 applications per email per hour, 10 per IP per hour
 */

import { createClient } from '@supabase/supabase-js'

interface ApplicationBody {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  resume_url?: string | null
  experience_years?: number | null
  notes?: string | null
  source?: string | null
  target_position_id?: string | null
}

// Rate limiting via Supabase — checks recent candidate submissions.
// This is serverless-safe (persisted to DB) unlike in-memory Maps.
// Falls back to allowing the request if the rate limit check itself fails.
async function checkApplicationRateLimit(
  supabase: ReturnType<typeof createClient>,
  email: string,
  clientIP: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  try {
    // Check by email (5 per hour)
    const { count: emailCount } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo)

    if ((emailCount || 0) >= 5) {
      return { allowed: false, reason: 'Too many applications from this email address. Please try again later.' }
    }

    // Check by IP via application metadata (10 per hour) — stored in notes field
    // This is a best-effort check since IP is not a dedicated column
    const { count: ipCount } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .ilike('notes', `%[ip:${clientIP}]%`)
      .gte('created_at', oneHourAgo)

    if ((ipCount || 0) >= 10) {
      return { allowed: false, reason: 'Too many applications from this network. Please try again later.' }
    }

    return { allowed: true }
  } catch {
    // If rate limit check fails, allow the request (fail-open for UX)
    return { allowed: true }
  }
}

export default defineEventHandler(async (event) => {
  // Get client identifiers for rate limiting
  const clientIP = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 
                   getHeader(event, 'x-real-ip') ||
                   event.node.req.socket?.remoteAddress || 
                   'unknown'
  
  const body = await readBody<ApplicationBody>(event)

  // Validate required fields
  if (!body.first_name || !body.last_name || !body.email) {
    throw createError({
      statusCode: 400,
      message: 'First name, last name, and email are required'
    })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format'
    })
  }

  const userAgent = getHeader(event, 'user-agent') || null

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

  // Serverless-safe rate limiting via Supabase (replaces in-memory Map)
  const rateLimitResult = await checkApplicationRateLimit(adminClient, body.email, clientIP)
  if (!rateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      message: rateLimitResult.reason || 'Too many requests. Please try again later.'
    })
  }

  try {
    // Check for duplicate applications (same email)
    const { data: existingCandidate } = await adminClient
      .from('candidates')
      .select('id, email, status')
      .eq('email', body.email.toLowerCase())
      .single()

    if (existingCandidate) {
      // Update existing record rather than creating duplicate
      const { data: updatedCandidate, error: updateError } = await adminClient
        .from('candidates')
        .update({
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone || null,
          resume_url: body.resume_url || existingCandidate.resume_url,
          experience_years: body.experience_years || null,
          notes: `[ip:${clientIP}] [${new Date().toISOString()}] ${body.notes || 'resubmission'}\n\n${existingCandidate.notes || ''}`.trim(),
          source: body.source || 'website',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCandidate.id)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        message: 'Your application has been updated. We will be in touch soon!',
        data: {
          candidateId: existingCandidate.id,
          isUpdate: true
        }
      }
    }

    // Create new candidate
    const { data: candidate, error: candidateError } = await adminClient
      .from('candidates')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email.toLowerCase(),
        phone: body.phone || null,
        resume_url: body.resume_url || null,
        experience_years: body.experience_years || null,
        notes: `[ip:${clientIP}]${body.notes ? ' ' + body.notes : ''}`.trim(),
        source: body.source || 'website',
        referral_source: 'Public Careers Page',
        target_position_id: body.target_position_id || null,
        status: 'new',
        candidate_type: 'applicant',
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (candidateError) throw candidateError

    // Also create a unified_persons record for lifecycle tracking
    try {
      const { data: person, error: personError } = await adminClient
        .from('unified_persons')
        .insert({
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email.toLowerCase(),
          phone_mobile: body.phone || null,
          current_stage: 'applicant',
          source_type: 'careers_page',
          source_detail: body.source || 'website',
          candidate_id: candidate.id
        })
        .select()
        .single()

      if (personError) {
        // Log but don't fail - candidate was created
        logger.warn('Failed to create unified_persons record', 'public/apply', { error: personError })
      }
    } catch (personErr) {
      logger.warn('Error creating unified_persons', 'public/apply', { error: personErr })
    }

    return {
      success: true,
      message: 'Thank you for your application! Our team will review it and contact you soon.',
      data: {
        candidateId: candidate.id,
        isUpdate: false
      }
    }
  } catch (err: any) {
    logger.error('Error creating candidate', err, 'public/apply')
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to submit application'
    })
  }
})
