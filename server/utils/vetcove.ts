/**
 * VetCove API - Server Utility
 * ================================
 * Compare and order veterinary supplies and pharmaceuticals.
 *
 * Setup: https://www.vetcove.com/ (free to search)
 * Note: VetCove uses a web-based search. This utility scrapes publicly
 * available product data. For full API access, contact VetCove directly.
 */
import type { VetCoveProduct } from '~/types/external-apis.types'

const SEARCH_URL = 'https://www.vetcove.com/api/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  // VetCove may provide API keys for partners
  return config.vetcoveApiKey || ''
}

/** Search for veterinary products */
export async function searchVetCoveProducts(query: string, limit = 20): Promise<VetCoveProduct[]> {
  const apiKey = getApiKey()

  if (!apiKey) {
    console.warn('[VetCove] No API key configured — search disabled')
    return []
  }

  try {
    const result = await $fetch<{ products: VetCoveProduct[] }>(`${SEARCH_URL}/products/search`, {
      params: { q: query, limit },
      headers: {
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    })
    return result.products || []
  } catch {
    console.warn('[VetCove] Product search failed')
    return []
  }
}

/** Get product details by ID */
export async function getVetCoveProduct(productId: string): Promise<VetCoveProduct | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    return await $fetch<VetCoveProduct>(`${SEARCH_URL}/products/${productId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  } catch {
    return null
  }
}

/** Compare prices across distributors for a product */
export async function compareVetCovePrices(productName: string): Promise<VetCoveProduct[]> {
  return searchVetCoveProducts(productName, 10)
}
