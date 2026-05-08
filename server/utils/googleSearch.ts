/**
 * Google Custom Search JSON API - Server Utility
 * ================================================
 * Domain-restricted web search via a Programmable Search Engine (CSE).
 * Free tier: 100 queries/day. Paid: $5 per 1,000 queries (up to 10k/day).
 *
 * Setup:
 *   1. Create a Programmable Search Engine at
 *      https://programmablesearchengine.google.com/controlpanel/create
 *      Add the domains you want (e.g. avma.org/*, state board sites).
 *      Copy the "Search engine ID" → GOOGLE_CSE_ID
 *   2. Enable the Custom Search API at
 *      https://console.cloud.google.com/apis/library/customsearch.googleapis.com
 *      Create an API key under APIs & Services → Credentials → GOOGLE_CSE_API_KEY
 *
 * Docs: https://developers.google.com/custom-search/v1/using_rest
 */
import type {
  GoogleCseResponse,
  GoogleCseSearchOptions,
} from '~/types/external-apis.types'

const BASE_URL = 'https://www.googleapis.com/customsearch/v1'

function getCredentials(): { key: string; cx: string } {
  const config = useRuntimeConfig()
  const key = config.googleCseApiKey as string | undefined
  const cx = config.googleCseId as string | undefined
  if (!key) throw new Error('Google CSE API key not configured (GOOGLE_CSE_API_KEY)')
  if (!cx) throw new Error('Google CSE engine ID not configured (GOOGLE_CSE_ID)')
  return { key, cx }
}

/**
 * Search the web with Google Custom Search.
 * Results are restricted to whatever sites are configured in your
 * Programmable Search Engine, optionally narrowed further by `siteSearch`.
 */
export async function googleSearch(
  query: string,
  options: GoogleCseSearchOptions = {},
): Promise<GoogleCseResponse> {
  const { key, cx } = getCredentials()

  const params: Record<string, string> = {
    key,
    cx,
    q: query,
  }

  if (options.num != null) params.num = String(Math.min(Math.max(options.num, 1), 10))
  if (options.start != null) params.start = String(options.start)
  if (options.lr) params.lr = options.lr
  if (options.cr) params.cr = options.cr
  if (options.dateRestrict) params.dateRestrict = options.dateRestrict
  if (options.siteSearch) params.siteSearch = options.siteSearch
  if (options.siteSearchFilter) params.siteSearchFilter = options.siteSearchFilter
  if (options.safe) params.safe = options.safe

  return $fetch<GoogleCseResponse>(BASE_URL, {
    method: 'GET',
    query: params,
  })
}

/**
 * Convenience: search a query restricted to a specific list of domains.
 * Issues one request per domain (since the CSE API only accepts a single
 * `siteSearch` value) and merges the results, deduped by URL.
 *
 * Use this when your PSE is configured broadly but for a given query you
 * want to narrow further (e.g. only avma.org for one call, only a state
 * board site for another).
 */
export async function googleSearchDomains(
  query: string,
  domains: string[],
  options: Omit<GoogleCseSearchOptions, 'siteSearch' | 'siteSearchFilter'> = {},
): Promise<GoogleCseResponse['items']> {
  const responses = await Promise.all(
    domains.map(domain =>
      googleSearch(query, {
        ...options,
        siteSearch: domain,
        siteSearchFilter: 'i',
      }).catch(() => null),
    ),
  )

  const seen = new Set<string>()
  const merged: NonNullable<GoogleCseResponse['items']> = []
  for (const res of responses) {
    if (!res?.items) continue
    for (const item of res.items) {
      if (seen.has(item.link)) continue
      seen.add(item.link)
      merged.push(item)
    }
  }
  return merged
}
