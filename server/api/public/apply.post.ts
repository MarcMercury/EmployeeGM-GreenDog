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

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 10 * 60 * 1000)

export default defineEventHandler(async (event) => {
  // Get client identifiers for rate limiting
  const clientIP = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 
                   getHeader(event, 'x-real-ip') ||
                   event.node.req.socket?.remoteAddress || 
                   'unknown'
  
  // Rate limit by IP: 10 requests per hour
  const ipKey = `apply:ip:${clientIP}`
  if (!checkRateLimit(ipKey, 10, 60 * 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Too many applications from this location. Please try again later.'
    })
  }
  
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
  
  // Rate limit by email: 5 requests per hour
  const emailKey = `apply:email:${body.email.toLowerCase()}`
  if (!checkRateLimit(emailKey, 5, 60 * 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Too many applications with this email. Please try again later.'
    })
  }

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
          notes: body.notes ? `[${new Date().toISOString()}] ${body.notes}\n\n${existingCandidate.notes || ''}` : existingCandidate.notes,
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
        notes: body.notes || null,
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
        console.warn('Failed to create unified_persons record:', personError)
      }
    } catch (personErr) {
      console.warn('Error creating unified_persons:', personErr)
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
    console.error('Error creating candidate:', err)
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to submit application'
    })
  }
})
