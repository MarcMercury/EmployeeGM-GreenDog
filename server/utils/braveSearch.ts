/**
 * Brave Search API - Server Utility
 * ===================================
 * Independent web-search index (does not rely on Google/Bing).
 * Free tier: 1 query/sec, 2,000 queries/month.
 *
 * Setup: https://api-dashboard.search.brave.com/ → API Keys → BRAVE_API_KEY
 * Docs:  https://api-dashboard.search.brave.com/app/documentation/web-search/get-started
 */
import type { BraveSearchOptions, BraveWebSearchResponse } from '~/types/external-apis.types'

const BASE_URL = 'https://api.search.brave.com/res/v1/web/search'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.braveApiKey) throw new Error('Brave Search API key not configured (BRAVE_API_KEY)')
  return config.braveApiKey as string
}

/**
 * Web search via Brave. Returns ranked organic results.
 */
export async function braveSearch(
  query: string,
  options: BraveSearchOptions = {},
): Promise<BraveWebSearchResponse> {
  const params: Record<string, string> = { q: query }
  if (options.count != null) params.count = String(Math.min(Math.max(options.count, 1), 20))
  if (options.offset != null) params.offset = String(options.offset)
  if (options.country) params.country = options.country
  if (options.search_lang) params.search_lang = options.search_lang
  if (options.freshness) params.freshness = options.freshness

  return $fetch<BraveWebSearchResponse>(BASE_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': getApiKey(),
    },
    params,
  })
}
