/**
 * Create Single Candidate API
 * 
 * POST /api/recruiting/create-candidate
 * 
 * Creates a single candidate using service role to bypass RLS.
 * Authorization is checked in code before insert.
 */

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

interface CandidateInput {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  target_position_id?: string | null
  source?: string
  referral_source?: string | null
  notes?: string | null
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Please log in' })
    }

    const authUserId = (user as any).sub || (user as any).id
    if (!authUserId) {
      throw createError({ statusCode: 401, message: 'Invalid session' })
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', authUserId)
      .single()

    const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: 'Permission denied' })
    }

    // Read body
    const body = await readBody<CandidateInput>(event)
    
    // Validate required fields
    if (!body.first_name?.trim()) {
      throw createError({ statusCode: 400, message: 'First name is required' })
    }
    if (!body.last_name?.trim()) {
      throw createError({ statusCode: 400, message: 'Last name is required' })
    }
    if (!body.email?.trim()) {
      throw createError({ statusCode: 400, message: 'Email is required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      throw createError({ statusCode: 400, message: 'Invalid email format' })
    }

    const email = body.email.toLowerCase().trim()

    // Use service role client to bypass RLS
    const supabaseAdmin = await serverSupabaseServiceRole(event)

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      throw createError({ statusCode: 409, message: 'A candidate with this email already exists' })
    }

    // Normalize and insert
    const candidate = {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email,
      phone: normalizePhone(body.phone),
      city: body.city?.trim() || null,
      state: normalizeState(body.state),
      postal_code: body.postal_code?.trim() || null,
      target_position_id: body.target_position_id || null,
      source: body.source || 'Manual Entry',
      referral_source: body.referral_source?.trim() || null,
      notes: body.notes?.trim() || null,
      status: 'new'
    }

    console.log('[create-candidate] Inserting:', candidate.email)

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .insert(candidate)
      .select('id, first_name, last_name, email')
      .single()

    if (error) {
      console.error('[create-candidate] Insert error:', error)
      throw createError({ statusCode: 500, message: error.message })
    }

    console.log('[create-candidate] Created:', data.id)

    return {
      success: true,
      data
    }

  } catch (err: any) {
    console.error('[create-candidate] Error:', err.message)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to create candidate' })
  }
})

// Helper functions
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const trimmed = digits.slice(1)
    return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`
  }
  return phone.trim() || null
}

function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null
  const lower = state.toLowerCase().trim()
  
  if (lower.length === 2) {
    return lower.toUpperCase()
  }
  
  const stateMap: Record<string, string> = {
    'california': 'CA', 'texas': 'TX', 'florida': 'FL', 'new york': 'NY',
    'pennsylvania': 'PA', 'illinois': 'IL', 'ohio': 'OH', 'georgia': 'GA',
    'north carolina': 'NC', 'michigan': 'MI', 'new jersey': 'NJ', 'virginia': 'VA',
    'washington': 'WA', 'arizona': 'AZ', 'massachusetts': 'MA', 'tennessee': 'TN',
    'indiana': 'IN', 'missouri': 'MO', 'maryland': 'MD', 'wisconsin': 'WI',
    'colorado': 'CO', 'minnesota': 'MN', 'south carolina': 'SC', 'alabama': 'AL',
    'louisiana': 'LA', 'kentucky': 'KY', 'oregon': 'OR', 'oklahoma': 'OK',
    'connecticut': 'CT', 'utah': 'UT', 'iowa': 'IA', 'nevada': 'NV',
    'arkansas': 'AR', 'mississippi': 'MS', 'kansas': 'KS', 'new mexico': 'NM',
    'nebraska': 'NE', 'west virginia': 'WV', 'idaho': 'ID', 'hawaii': 'HI',
    'new hampshire': 'NH', 'maine': 'ME', 'montana': 'MT', 'rhode island': 'RI',
    'delaware': 'DE', 'south dakota': 'SD', 'north dakota': 'ND', 'alaska': 'AK',
    'vermont': 'VT', 'wyoming': 'WY'
  }
  
  return stateMap[lower] || state.trim()
}
