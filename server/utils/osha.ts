/**
 * OSHA API - Server Utility
 * ============================
 * Pull safety standards and inspection data for compliance tracking.
 *
 * Setup: Free, no key required — https://www.osha.gov/developers
 */
import type { OSHAInspection } from '~/types/external-apis.types'

const BASE_URL = 'https://enforcedata.dol.gov/api/v2'

/** Search OSHA inspections by establishment name or SIC code */
export async function searchOSHAInspections(options: {
  estabName?: string
  state?: string
  sicCode?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<OSHAInspection[]> {
  const filters: string[] = []
  if (options.estabName) filters.push(`estab_name eq '${options.estabName}'`)
  if (options.state) filters.push(`site_state eq '${options.state}'`)
  if (options.sicCode) filters.push(`sic_code eq '${options.sicCode}'`)
  if (options.startDate) filters.push(`open_date ge '${options.startDate}'`)
  if (options.endDate) filters.push(`open_date le '${options.endDate}'`)

  const params = new URLSearchParams({
    $filter: filters.join(' and ') || "site_state eq 'CA'",
    $top: String(options.limit || 25),
    $orderby: 'open_date desc',
  })

  const result = await $fetch<{ d: { results: OSHAInspection[] } }>(
    `${BASE_URL}/OSHA_Inspection?${params}`
  ).catch(() => ({ d: { results: [] } }))

  return result.d?.results || []
}

/** Get veterinary-specific OSHA standards (SIC 0742 = Veterinary Services) */
export async function getVeterinaryOSHAInspections(state = 'CA', limit = 25): Promise<OSHAInspection[]> {
  return searchOSHAInspections({ sicCode: '0742', state, limit })
}

/** Get violations for a specific inspection */
export async function getOSHAViolations(activityNr: number): Promise<any[]> {
  const result = await $fetch<{ d: { results: any[] } }>(
    `${BASE_URL}/OSHA_Violation?$filter=activity_nr eq ${activityNr}`
  ).catch(() => ({ d: { results: [] } }))

  return result.d?.results || []
}
