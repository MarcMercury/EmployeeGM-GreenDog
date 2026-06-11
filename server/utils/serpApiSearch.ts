/**
 * SerpApi - Server Utility
 * =========================
 * Structured Google / Bing / Google-Jobs SERP results returned as JSON.
 * Free tier: 100 searches/month.
 *
 * Setup: https://serpapi.com/manage-api-key → SERPAPI_API_KEY
 * Docs:  https://serpapi.com/search-api
 */
import type { SerpApiSearchOptions, SerpApiSearchResponse } from '~/types/external-apis.types'

const BASE_URL = 'https://serpapi.com/search.json'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.serpApiKey) throw new Error('SerpApi key not configured (SERPAPI_API_KEY)')
  return config.serpApiKey as string
}

/**
 * Run a SERP query via SerpApi. Defaults to the Google engine and
 * returns `organic_results`.
 */
export async function serpApiSearch(
  query: string,
  options: SerpApiSearchOptions = {},
): Promise<SerpApiSearchResponse> {
  const params: Record<string, string> = {
    api_key: getApiKey(),
    engine: options.engine ?? 'google',
    q: query,
  }
  if (options.num != null) params.num = String(Math.min(Math.max(options.num, 1), 20))
  if (options.location) params.location = options.location
  if (options.google_domain) params.google_domain = options.google_domain
  if (options.gl) params.gl = options.gl
  if (options.hl) params.hl = options.hl

  return $fetch<SerpApiSearchResponse>(BASE_URL, { method: 'GET', params })
}
