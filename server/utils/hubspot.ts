/**
 * HubSpot API - Server Utility
 * ================================
 * CRM for partner relations, referral tracking, lead management.
 * Free CRM tier available.
 *
 * Setup: https://developers.hubspot.com/
 */
import type { HubSpotContact, HubSpotDeal } from '~/types/external-apis.types'

const BASE_URL = 'https://api.hubapi.com'

function getAccessToken(): string {
  const config = useRuntimeConfig()
  if (!config.hubspotAccessToken) throw new Error('HubSpot access token not configured')
  return config.hubspotAccessToken
}

async function hubspotFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ── Contacts ──

export async function listHubSpotContacts(
  options?: { limit?: number; after?: string; properties?: string[] }
): Promise<{ results: HubSpotContact[]; paging?: { next: { after: string } } }> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.after) params.set('after', options.after)
  if (options?.properties) params.set('properties', options.properties.join(','))
  return hubspotFetch(`/crm/v3/objects/contacts?${params}`)
}

export async function createHubSpotContact(properties: Record<string, string>): Promise<HubSpotContact> {
  return hubspotFetch<HubSpotContact>('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  })
}

export async function updateHubSpotContact(contactId: string, properties: Record<string, string>): Promise<HubSpotContact> {
  return hubspotFetch<HubSpotContact>(`/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  })
}

export async function searchHubSpotContacts(
  filters: { propertyName: string; operator: string; value: string }[],
  properties?: string[]
): Promise<{ results: HubSpotContact[] }> {
  return hubspotFetch('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{ filters }],
      properties: properties || ['email', 'firstname', 'lastname', 'phone', 'company'],
    }),
  })
}

// ── Deals ──

export async function listHubSpotDeals(
  options?: { limit?: number; after?: string; properties?: string[] }
): Promise<{ results: HubSpotDeal[]; paging?: { next: { after: string } } }> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.after) params.set('after', options.after)
  if (options?.properties) params.set('properties', options.properties.join(','))
  return hubspotFetch(`/crm/v3/objects/deals?${params}`)
}

export async function createHubSpotDeal(properties: Record<string, string>): Promise<HubSpotDeal> {
  return hubspotFetch<HubSpotDeal>('/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  })
}

export async function updateHubSpotDeal(dealId: string, properties: Record<string, string>): Promise<HubSpotDeal> {
  return hubspotFetch<HubSpotDeal>(`/crm/v3/objects/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  })
}

// ── Associations (link contacts to deals) ──

export async function associateHubSpotObjects(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  associationType: string
): Promise<void> {
  await hubspotFetch(`/crm/v3/objects/${fromType}/${fromId}/associations/${toType}/${toId}/${associationType}`, {
    method: 'PUT',
  })
}
