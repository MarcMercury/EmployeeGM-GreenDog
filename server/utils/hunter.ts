/**
 * Hunter.io API - Server Utility
 * ================================
 * Email finder, domain search, combined enrichment, and company discovery.
 *
 * Setup: https://hunter.io/api-keys → copy key into HUNTER_API_KEY
 * Docs:  https://hunter.io/api-documentation/v2
 */
import type {
  HunterCombinedFindResponse,
  HunterDiscoverOptions,
  HunterDiscoverResponse,
  HunterDomainSearchResponse,
  HunterEmailFinderResponse,
} from '~/types/external-apis.types'

const BASE_URL = 'https://api.hunter.io/v2'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.hunterApiKey) throw new Error('Hunter.io API key not configured (HUNTER_API_KEY)')
  return config.hunterApiKey as string
}

async function hunterGet<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  const query: Record<string, any> = { ...params, api_key: getApiKey() }
  return $fetch<T>(`${BASE_URL}${path}`, { method: 'GET', query })
}

async function hunterPost<T>(path: string, body: Record<string, any>): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}?api_key=${encodeURIComponent(getApiKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

/**
 * Domain search — list email addresses found for a domain (or company name).
 * Provide either `domain` or `company`.
 */
export async function hunterDomainSearch(opts: {
  domain?: string
  company?: string
  limit?: number
  offset?: number
  type?: 'personal' | 'generic'
  seniority?: string // e.g. 'junior,senior,executive'
  department?: string
  required_field?: string
}): Promise<HunterDomainSearchResponse> {
  if (!opts.domain && !opts.company) {
    throw new Error('hunterDomainSearch: domain or company is required')
  }
  return hunterGet<HunterDomainSearchResponse>('/domain-search', opts)
}

/**
 * Email finder — find the most likely email address for a person at a domain/company.
 */
export async function hunterEmailFinder(opts: {
  domain?: string
  company?: string
  first_name?: string
  last_name?: string
  full_name?: string
  max_duration?: number
}): Promise<HunterEmailFinderResponse> {
  if (!opts.domain && !opts.company) {
    throw new Error('hunterEmailFinder: domain or company is required')
  }
  if (!opts.full_name && !(opts.first_name && opts.last_name)) {
    throw new Error('hunterEmailFinder: full_name or (first_name + last_name) is required')
  }
  return hunterGet<HunterEmailFinderResponse>('/email-finder', opts)
}

/**
 * Combined enrichment — person + company data for an email address.
 */
export async function hunterCombinedFind(email: string): Promise<HunterCombinedFindResponse> {
  if (!email) throw new Error('hunterCombinedFind: email is required')
  return hunterGet<HunterCombinedFindResponse>('/combined/find', { email })
}

/**
 * Discover — search for companies matching filters (industry, size, tech, etc.).
 * Uses POST per Hunter docs.
 */
export async function hunterDiscover(
  options: HunterDiscoverOptions = {},
): Promise<HunterDiscoverResponse> {
  const body: Record<string, any> = {}
  if (options.query) body.query = options.query
  if (options.filters) body.filters = options.filters
  if (options.limit != null) body.limit = options.limit
  if (options.offset != null) body.offset = options.offset
  return hunterPost<HunterDiscoverResponse>('/discover', body)
}
