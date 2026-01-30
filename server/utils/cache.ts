/**
 * Server-side API Response Caching Utility
 * 
 * Provides simple in-memory caching with TTL for expensive API endpoints
 */

import { logger } from './logger'

interface CacheEntry<T> {
  data: T
  expiresAt: number
  createdAt: number
}

// Simple in-memory cache (per-server instance)
// For distributed caching, use Redis or Vercel KV
const cache = new Map<string, CacheEntry<any>>()

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for rapidly changing data
  MEDIUM: 300,         // 5 minutes - for moderately stable data
  LONG: 900,           // 15 minutes - for stable data
  VERY_LONG: 3600,     // 1 hour - for rarely changing data
  DAY: 86400,          // 24 hours - for static data
} as const

/**
 * Get cached data or execute fetcher
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(key)

  // Return cached data if valid
  if (cached && cached.expiresAt > now) {
    logger.debug('[Cache] Hit', { key, age: `${Math.round((now - cached.createdAt) / 1000)}s` })
    return cached.data
  }

  // Fetch fresh data
  logger.debug('[Cache] Miss', { key })
  const data = await fetcher()

  // Store in cache
  cache.set(key, {
    data,
    expiresAt: now + (ttlSeconds * 1000),
    createdAt: now
  })

  return data
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCache(key: string): boolean {
  const deleted = cache.delete(key)
  if (deleted) {
    logger.debug('[Cache] Invalidated', { key })
  }
  return deleted
}

/**
 * Invalidate all cache keys matching a prefix
 */
export function invalidateCachePrefix(prefix: string): number {
  let count = 0
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
      count++
    }
  }
  if (count > 0) {
    logger.debug('[Cache] Invalidated prefix', { prefix, count })
  }
  return count
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  const size = cache.size
  cache.clear()
  logger.info('[Cache] Cleared', { entriesRemoved: size })
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  size: number
  entries: Array<{ key: string; age: number; ttlRemaining: number }>
} {
  const now = Date.now()
  const entries: Array<{ key: string; age: number; ttlRemaining: number }> = []

  for (const [key, entry] of cache.entries()) {
    entries.push({
      key,
      age: Math.round((now - entry.createdAt) / 1000),
      ttlRemaining: Math.max(0, Math.round((entry.expiresAt - now) / 1000))
    })
  }

  return {
    size: cache.size,
    entries
  }
}

/**
 * Set Cache-Control headers for HTTP response caching
 * Use this for public, immutable responses
 */
export function setCacheHeaders(
  event: any,
  options: {
    maxAge?: number
    staleWhileRevalidate?: number
    public?: boolean
    private?: boolean
    noCache?: boolean
  } = {}
): void {
  const {
    maxAge = 60,
    staleWhileRevalidate = 60,
    public: isPublic = false,
    private: isPrivate = true,
    noCache = false
  } = options

  if (noCache) {
    setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
    return
  }

  const directives: string[] = []

  if (isPublic) {
    directives.push('public')
  } else if (isPrivate) {
    directives.push('private')
  }

  directives.push(`max-age=${maxAge}`)

  if (staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`)
  }

  setHeader(event, 'Cache-Control', directives.join(', '))
}

/**
 * Cache key generator helpers
 */
export const cacheKey = {
  // Generate cache key for list queries
  list: (entity: string, params?: Record<string, any>): string => {
    const base = `list:${entity}`
    if (!params || Object.keys(params).length === 0) {
      return base
    }
    const sorted = Object.keys(params).sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')
    return `${base}:${sorted}`
  },

  // Generate cache key for single entity
  entity: (entity: string, id: string): string => {
    return `entity:${entity}:${id}`
  },

  // Generate cache key for aggregations
  aggregate: (entity: string, aggregation: string): string => {
    return `agg:${entity}:${aggregation}`
  },

  // Generate cache key for user-specific data
  user: (userId: string, resource: string): string => {
    return `user:${userId}:${resource}`
  }
}

// Cleanup expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    let expired = 0
    
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key)
        expired++
      }
    }
    
    if (expired > 0) {
      logger.debug('[Cache] Cleanup', { expiredEntries: expired, remainingEntries: cache.size })
    }
  }, 5 * 60 * 1000)
}
