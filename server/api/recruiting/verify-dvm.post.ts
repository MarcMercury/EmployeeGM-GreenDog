/**
 * Verify a DVM Prospect Against Free Public Sources
 *
 * POST /api/recruiting/verify-dvm
 *
 * Combines the three free integrations:
 *   1. NPI Registry (CMS)        — confirms US healthcare provider record.
 *   2. State Veterinary Board    — license verification (CA scraped, others
 *                                  surfaced as deep-link URLs).
 *   3. Specialty diplomate dirs  — deep-link to ACVS/ACVIM/etc. directory.
 *   4. AVMA accredited school    — fuzzy match against the AVMA COE list.
 *
 * No external API keys required.
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { verifyDvmInNpi } from '../../utils/npi-registry'
import {
  buildStateBoardSearchUrl,
  getStateBoardLookup,
  searchCaliforniaVmb,
  getDiplomateDirectoryByCredential,
  isAvmaAccreditedSchool,
  AVMA_ACCREDITED_DIRECTORY_URL,
  type CaVmbLicense,
  type DiplomateDirectory,
  type StateBoardLookup,
} from '../../utils/state-vet-boards'
import { logger } from '../../utils/logger'

interface VerifyInput {
  first_name: string
  last_name: string
  state?: string
  credentials?: string         // e.g. "DVM, DACVS"
  vet_school?: string
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

  const body = await readBody<VerifyInput>(event)
  if (!body?.first_name?.trim() || !body?.last_name?.trim()) {
    throw createError({ statusCode: 400, message: 'first_name and last_name are required' })
  }

  const firstName = body.first_name.trim()
  const lastName = body.last_name.trim()
  const state = body.state?.trim().toUpperCase()
  const credentials = body.credentials?.trim() ?? ''

  // Run all checks in parallel.
  const [npi, caLicenses] = await Promise.all([
    verifyDvmInNpi({ firstName, lastName, state }).catch(err => {
      logger.warn(`NPI verify failed: ${(err as Error).message}`, 'verify-dvm')
      return null
    }),
    state === 'CA'
      ? searchCaliforniaVmb({ firstName, lastName }).catch(err => {
          logger.warn(`CA VMB scrape failed: ${(err as Error).message}`, 'verify-dvm')
          return [] as CaVmbLicense[]
        })
      : Promise.resolve<CaVmbLicense[]>([]),
  ])

  const stateBoard: StateBoardLookup | null = state ? getStateBoardLookup(state) : null
  const stateSearchUrl = state ? buildStateBoardSearchUrl(state, firstName, lastName) : null

  // Detect specialty credential (DACVS, DACVIM, etc.) and surface the directory.
  const diplomateDirectory: DiplomateDirectory | null = credentials
    ? getDiplomateDirectoryByCredential(credentials)
    : null
  const diplomateSearchUrl = diplomateDirectory?.buildSearchUrl
    ? diplomateDirectory.buildSearchUrl(lastName)
    : diplomateDirectory?.directoryUrl ?? null

  const avmaSchoolMatch = body.vet_school
    ? isAvmaAccreditedSchool(body.vet_school)
    : null

  // Compose a confidence score.
  let score = 0
  const reasons: string[] = []
  if (npi?.matched) {
    score += npi.isVeterinary ? 25 : 10
    reasons.push(npi.isVeterinary
      ? `NPI match with veterinary taxonomy (${npi.npiNumber})`
      : `NPI match found (${npi.npiNumber}) — non-vet taxonomy, inconclusive`)
  }
  if (caLicenses.length > 0) {
    const active = caLicenses.find(l => /active|current/i.test(l.status ?? ''))
    if (active) {
      score += 50
      reasons.push(`CA VMB license ${active.licenseNumber} — ${active.status}`)
    } else {
      score += 25
      reasons.push(`CA VMB record(s) found (${caLicenses.length})`)
    }
  }
  if (avmaSchoolMatch === true) {
    score += 15
    reasons.push('Vet school matches AVMA-accredited list')
  } else if (avmaSchoolMatch === false && body.vet_school) {
    reasons.push('Vet school did NOT match AVMA-accredited list (verify spelling)')
  }
  if (diplomateDirectory) {
    reasons.push(`Confirm ${diplomateDirectory.diplomateCredential} via ${diplomateDirectory.abbreviation} directory`)
  }
  score = Math.min(score, 100)

  return {
    success: true,
    inputs: { firstName, lastName, state, credentials, vet_school: body.vet_school ?? null },
    confidence: score,
    reasons,
    npi,
    california_vmb: state === 'CA'
      ? { searched: true, results: caLicenses, count: caLicenses.length }
      : null,
    state_board: stateBoard
      ? { ...stateBoard, deep_link_url: stateSearchUrl }
      : null,
    diplomate_directory: diplomateDirectory
      ? { ...diplomateDirectory, deep_link_url: diplomateSearchUrl }
      : null,
    avma: {
      directory_url: AVMA_ACCREDITED_DIRECTORY_URL,
      school_match: avmaSchoolMatch,
    },
  }
})
