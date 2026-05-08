/**
 * NPI Registry API (CMS) — Server Utility
 * =========================================
 * 100% free, no API key. US National Plan & Provider Enumeration System.
 *
 * Useful for:
 *   - Confirming a DVM/vet is registered as a healthcare provider (mixed
 *     practice DVMs occasionally enroll, e.g. for one-health / public-health
 *     billing). Most companion-animal DVMs will NOT appear here, so a
 *     missing record is NOT proof the person is fake.
 *   - Verifying NPI numbers, taxonomies, addresses, and license states.
 *
 * Docs: https://npiregistry.cms.hhs.gov/api-page
 * Endpoint: https://npiregistry.cms.hhs.gov/api/?version=2.1
 *
 * Veterinary-related taxonomy codes (NUCC):
 *   174M00000X — Veterinarian (rare; the registry is human-provider focused
 *                but some practitioners self-classify here).
 *   Most DVMs simply will not be listed.
 */

import { logger } from './logger'

const NPI_URL = 'https://npiregistry.cms.hhs.gov/api/'
const VERSION = '2.1'

export interface NpiAddress {
  country_code?: string
  country_name?: string
  address_purpose?: 'LOCATION' | 'MAILING'
  address_type?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postal_code?: string
  telephone_number?: string
  fax_number?: string
}

export interface NpiTaxonomy {
  code?: string
  taxonomy_group?: string
  desc?: string
  state?: string
  license?: string
  primary?: boolean
}

export interface NpiBasic {
  first_name?: string
  last_name?: string
  middle_name?: string
  credential?: string
  sole_proprietor?: string
  gender?: string
  enumeration_date?: string
  last_updated?: string
  status?: string
  name_prefix?: string
  name_suffix?: string
  organization_name?: string
}

export interface NpiResult {
  number: string
  enumeration_type: 'NPI-1' | 'NPI-2'
  basic: NpiBasic
  addresses: NpiAddress[]
  taxonomies: NpiTaxonomy[]
  identifiers?: Array<{ code?: string; desc?: string; issuer?: string; identifier?: string; state?: string }>
  endpoints?: any[]
}

interface NpiApiResponse {
  result_count: number
  results: NpiResult[]
  Errors?: Array<{ description?: string }>
}

export interface NpiSearchOptions {
  firstName?: string
  lastName?: string
  state?: string                 // Two-letter US state code
  city?: string
  postalCode?: string
  taxonomyDescription?: string   // e.g. "Veterinarian"
  /** Restrict to individual (NPI-1) or organizational (NPI-2) providers. */
  enumerationType?: 'NPI-1' | 'NPI-2'
  limit?: number                 // 1-200, default 10
  skip?: number                  // 0-1000
}

/**
 * Search the NPI registry. Returns up to `limit` matching providers.
 * No API key required. The endpoint requires at least one filter besides
 * `limit`/`skip`, which we enforce by demanding name OR state OR taxonomy.
 */
export async function searchNpiProviders(opts: NpiSearchOptions): Promise<NpiResult[]> {
  if (!opts.firstName && !opts.lastName && !opts.state && !opts.taxonomyDescription) {
    throw new Error('searchNpiProviders: at least one of firstName, lastName, state, or taxonomyDescription is required')
  }

  const params: Record<string, string> = {
    version: VERSION,
    limit: String(Math.min(Math.max(opts.limit ?? 10, 1), 200)),
    skip: String(Math.max(opts.skip ?? 0, 0)),
  }
  if (opts.firstName) params.first_name = opts.firstName
  if (opts.lastName) params.last_name = opts.lastName
  if (opts.state) params.state = opts.state.toUpperCase()
  if (opts.city) params.city = opts.city
  if (opts.postalCode) params.postal_code = opts.postalCode
  if (opts.taxonomyDescription) params.taxonomy_description = opts.taxonomyDescription
  if (opts.enumerationType) params.enumeration_type = opts.enumerationType

  try {
    const res = await $fetch<NpiApiResponse>(NPI_URL, { method: 'GET', query: params })
    if (res.Errors?.length) {
      logger.warn(`NPI registry returned errors: ${res.Errors.map(e => e.description).join('; ')}`, 'npi-registry')
      return []
    }
    return res.results ?? []
  } catch (err) {
    logger.error('NPI registry search failed', err as Error, 'npi-registry')
    return []
  }
}

/** Look up a single provider by their 10-digit NPI number. */
export async function getNpiProvider(npiNumber: string): Promise<NpiResult | null> {
  const clean = npiNumber.replace(/\D/g, '')
  if (clean.length !== 10) return null
  try {
    const res = await $fetch<NpiApiResponse>(NPI_URL, {
      method: 'GET',
      query: { version: VERSION, number: clean },
    })
    return res.results?.[0] ?? null
  } catch (err) {
    logger.error('NPI registry lookup failed', err as Error, 'npi-registry')
    return null
  }
}

export interface NpiVerificationResult {
  matched: boolean
  npiNumber?: string
  status?: string
  taxonomies: string[]
  licenseStates: string[]
  /** True if any taxonomy contains "veterinar" (case-insensitive). */
  isVeterinary: boolean
  result?: NpiResult
}

/**
 * Best-effort verification by name + state. Returns the first plausible match.
 * Note: most companion-animal DVMs are NOT in NPI; treat missing as inconclusive.
 */
export async function verifyDvmInNpi(opts: {
  firstName: string
  lastName: string
  state?: string
}): Promise<NpiVerificationResult> {
  const results = await searchNpiProviders({
    firstName: opts.firstName,
    lastName: opts.lastName,
    state: opts.state,
    enumerationType: 'NPI-1',
    limit: 5,
  })

  if (!results.length) {
    return { matched: false, taxonomies: [], licenseStates: [], isVeterinary: false }
  }

  // Prefer a record with a vet-flavored taxonomy if any exist.
  const veterinary = results.find(r =>
    r.taxonomies?.some(t => /veterinar/i.test(t.desc ?? ''))
  )
  const chosen = veterinary ?? results[0]

  const taxonomies = (chosen.taxonomies ?? [])
    .map(t => t.desc ?? t.code ?? '')
    .filter(Boolean)
  const licenseStates = Array.from(
    new Set((chosen.taxonomies ?? []).map(t => t.state).filter((s): s is string => !!s))
  )

  return {
    matched: true,
    npiNumber: chosen.number,
    status: chosen.basic?.status,
    taxonomies,
    licenseStates,
    isVeterinary: taxonomies.some(t => /veterinar/i.test(t)),
    result: chosen,
  }
}
