/**
 * Apollo.io API - Server Utility
 * ================================
 * People search, organization search, and enrichment.
 *
 * Setup: https://app.apollo.io/#/settings/integrations/api → copy key into APOLLO_API_KEY
 * Docs:  https://docs.apollo.io/reference/
 *
 * NOTE: Most search/enrichment endpoints require a paid Apollo plan with API access.
 */

const BASE_URL = 'https://api.apollo.io/api/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.apolloApiKey) throw new Error('Apollo.io API key not configured (APOLLO_API_KEY)')
  return config.apolloApiKey as string
}

async function apolloRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  payload: Record<string, any> = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    accept: 'application/json',
    'x-api-key': getApiKey(),
  }
  if (method === 'GET') {
    return $fetch<T>(`${BASE_URL}${path}`, { method, headers, query: payload })
  }
  return $fetch<T>(`${BASE_URL}${path}`, { method, headers, body: payload })
}

// ─────────────────────────────────────────────────────────────────────────────
// People Search
// https://docs.apollo.io/reference/people-search
// ─────────────────────────────────────────────────────────────────────────────
export interface ApolloPeopleSearchOptions {
  q_keywords?: string
  person_titles?: string[]
  person_seniorities?: string[]
  person_locations?: string[]
  organization_locations?: string[]
  q_organization_domains?: string // newline-separated list
  organization_ids?: string[]
  organization_num_employees_ranges?: string[]
  contact_email_status?: Array<'verified' | 'unverified' | 'likely to engage' | 'unavailable'>
  page?: number
  per_page?: number
}

export interface ApolloPerson {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  title?: string
  email?: string
  email_status?: string
  linkedin_url?: string
  photo_url?: string
  city?: string
  state?: string
  country?: string
  organization?: ApolloOrganization
  [key: string]: any
}

export interface ApolloOrganization {
  id: string
  name?: string
  website_url?: string
  primary_domain?: string
  industry?: string
  estimated_num_employees?: number
  city?: string
  state?: string
  country?: string
  [key: string]: any
}

export interface ApolloPeopleSearchResponse {
  people?: ApolloPerson[]
  contacts?: ApolloPerson[]
  pagination?: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
  [key: string]: any
}

export function apolloPeopleSearch(
  opts: ApolloPeopleSearchOptions,
): Promise<ApolloPeopleSearchResponse> {
  return apolloRequest<ApolloPeopleSearchResponse>('/mixed_people/search', 'POST', opts)
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization Search
// https://docs.apollo.io/reference/organization-search
// ─────────────────────────────────────────────────────────────────────────────
export interface ApolloOrganizationSearchOptions {
  q_organization_name?: string
  q_organization_keyword_tags?: string[]
  organization_locations?: string[]
  organization_num_employees_ranges?: string[]
  organization_industry_tag_ids?: string[]
  page?: number
  per_page?: number
}

export interface ApolloOrganizationSearchResponse {
  organizations?: ApolloOrganization[]
  accounts?: ApolloOrganization[]
  pagination?: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
  [key: string]: any
}

export function apolloOrganizationSearch(
  opts: ApolloOrganizationSearchOptions,
): Promise<ApolloOrganizationSearchResponse> {
  return apolloRequest<ApolloOrganizationSearchResponse>(
    '/mixed_companies/search',
    'POST',
    opts,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// People Enrichment (match a single person)
// https://docs.apollo.io/reference/people-enrichment
// ─────────────────────────────────────────────────────────────────────────────
export interface ApolloPeopleEnrichOptions {
  first_name?: string
  last_name?: string
  name?: string
  email?: string
  organization_name?: string
  domain?: string
  linkedin_url?: string
  reveal_personal_emails?: boolean
  reveal_phone_number?: boolean
}

export interface ApolloPeopleEnrichResponse {
  person?: ApolloPerson
  [key: string]: any
}

export function apolloPeopleEnrich(
  opts: ApolloPeopleEnrichOptions,
): Promise<ApolloPeopleEnrichResponse> {
  return apolloRequest<ApolloPeopleEnrichResponse>('/people/match', 'POST', opts)
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization Enrichment
// https://docs.apollo.io/reference/organization-enrichment
// ─────────────────────────────────────────────────────────────────────────────
export function apolloOrganizationEnrich(domain: string): Promise<{ organization?: ApolloOrganization }> {
  if (!domain) throw new Error('apolloOrganizationEnrich: domain is required')
  return apolloRequest<{ organization?: ApolloOrganization }>(
    '/organizations/enrich',
    'GET',
    { domain },
  )
}
