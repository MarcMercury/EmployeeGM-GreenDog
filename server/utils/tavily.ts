/**
 * Tavily Search API - Server Utility
 * ====================================
 * AI-optimized web search and content extraction for agents/RAG.
 * Free tier: 1,000 API credits/month.
 *
 * Setup: https://app.tavily.com/ → API Playground → copy `tvly-...` key
 * Docs:  https://docs.tavily.com/
 */
import type {
  TavilyExtractResponse,
  TavilySearchOptions,
  TavilySearchResponse,
} from '~/types/external-apis.types'

const BASE_URL = 'https://api.tavily.com'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.tavilyApiKey) throw new Error('Tavily API key not configured (TAVILY_API_KEY)')
  return config.tavilyApiKey as string
}

async function tavilyFetch<T>(path: string, body: Record<string, any>): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body,
  })
}

/**
 * Search the web with Tavily.
 * Returns AI-optimized snippets and (optionally) a synthesized answer.
 */
export async function tavilySearch(
  query: string,
  options: TavilySearchOptions = {},
): Promise<TavilySearchResponse> {
  return tavilyFetch<TavilySearchResponse>('/search', {
    query,
    search_depth: options.search_depth ?? 'basic',
    topic: options.topic ?? 'general',
    max_results: options.max_results ?? 5,
    include_answer: options.include_answer ?? false,
    include_raw_content: options.include_raw_content ?? false,
    include_images: options.include_images ?? false,
    include_domains: options.include_domains,
    exclude_domains: options.exclude_domains,
    days: options.days,
  })
}

/**
 * Extract clean content from one or more URLs.
 */
export async function tavilyExtract(
  urls: string | string[],
  options: { extract_depth?: 'basic' | 'advanced' } = {},
): Promise<TavilyExtractResponse> {
  return tavilyFetch<TavilyExtractResponse>('/extract', {
    urls: Array.isArray(urls) ? urls : [urls],
    extract_depth: options.extract_depth ?? 'basic',
  })
}
