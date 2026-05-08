/**
 * Import an AI-Discovered DVM Prospect into the Recruiting Pipeline
 *
 * POST /api/recruiting/import-prospect
 *
 * Accepts a prospect object returned by /api/recruiting/find-dvm-candidates
 * and inserts it as a candidate (status = 'new') so it appears in the
 * recruiting CRM/grid like any other candidate.
 *
 * Behavior:
 *   - If email is missing, generates a placeholder so the UNIQUE NOT NULL
 *     constraint is satisfied. Recruiter can edit the candidate later.
 *   - Skips insert and returns the existing record if email already exists.
 *   - Stores citation (source_url, source_name, AI provider) in notes.
 */

import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '../../utils/logger'

interface ProspectInput {
  first_name: string
  last_name: string
  credentials?: string | null
  specialty?: string | null
  current_employer?: string | null
  city?: string | null
  state?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  source_name?: string | null
  source_url?: string | null
  experience_years?: number | null
  vet_school?: string | null
  graduation_year?: number | null
  residency?: string | null
  actively_seeking?: boolean | null
  notes?: string | null
  match_score?: number | null
  provider?: string | null
  target_position_id?: string | null
}

const ALLOWED_ROLES = [
  'super_admin', 'admin', 'manager', 'hr_admin',
  'sup_admin', 'office_admin', 'marketing_admin',
]

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Please log in' })

  const authUserId = (user as any).sub || (user as any).id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Permission denied' })
  }

  const body = await readBody<ProspectInput>(event)

  if (!body?.first_name?.trim() || !body?.last_name?.trim()) {
    throw createError({ statusCode: 400, message: 'first_name and last_name are required' })
  }

  const admin = await serverSupabaseServiceRole(event)

  const email = (body.email || '').trim().toLowerCase() ||
    `prospect-${body.first_name.trim().toLowerCase()}-${body.last_name.trim().toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@unknown.local`

  // Check duplicate
  const { data: existing } = await admin
    .from('candidates')
    .select('id, first_name, last_name, email')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { success: true, alreadyExists: true, data: existing }
  }

  const noteParts: string[] = []
  if (body.credentials) noteParts.push(`Credentials: ${body.credentials}`)
  if (body.specialty) noteParts.push(`Specialty: ${body.specialty}`)
  if (body.vet_school) noteParts.push(`Vet School: ${body.vet_school}${body.graduation_year ? ` (${body.graduation_year})` : ''}`)
  if (body.residency) noteParts.push(`Residency: ${body.residency}`)
  if (body.current_employer) noteParts.push(`Currently at: ${body.current_employer}`)
  if (body.experience_years != null) noteParts.push(`Experience: ${body.experience_years} years`)
  if (body.actively_seeking) noteParts.push('Status: ACTIVELY JOB-SEEKING')
  if (body.match_score != null) noteParts.push(`AI match score: ${body.match_score}/100`)
  if (body.website_url) noteParts.push(`Website: ${body.website_url}`)
  if (body.source_url) noteParts.push(`Source: ${body.source_name || 'web'} — ${body.source_url}`)
  if (body.notes) noteParts.push(body.notes)

  const candidate: Record<string, unknown> = {
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    email,
    phone: normalizePhone(body.phone),
    linkedin_url: body.linkedin_url || null,
    source: `AI Discovery${body.provider ? ` (${body.provider})` : ''}`,
    status: 'new',
    notes: noteParts.join('\n') || null,
  }

  // Conditionally add columns that may not exist on older schemas
  if (body.target_position_id) candidate.target_position_id = body.target_position_id
  if (body.city) candidate.city = body.city
  if (body.state) candidate.state = normalizeState(body.state)

  logger.info('Importing AI prospect', 'import-prospect', { email })

  const { data, error } = await admin
    .from('candidates')
    .insert(candidate)
    .select('id, first_name, last_name, email, status')
    .single()

  if (error) {
    // Retry without optional columns if schema mismatch
    if (/column .* does not exist/i.test(error.message)) {
      delete candidate.target_position_id
      delete candidate.city
      delete candidate.state
      const retry = await admin
        .from('candidates')
        .insert(candidate)
        .select('id, first_name, last_name, email, status')
        .single()
      if (retry.error) {
        logger.error('Insert retry failed', retry.error, 'import-prospect')
        throw createError({ statusCode: 500, message: retry.error.message })
      }
      return { success: true, data: retry.data }
    }
    logger.error('Insert error', error, 'import-prospect')
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true, data }
})

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith('1')) {
    const t = digits.slice(1)
    return `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}`
  }
  return phone.trim() || null
}

function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null
  const lower = state.toLowerCase().trim()
  if (lower.length === 2) return lower.toUpperCase()
  return state.trim()
}
