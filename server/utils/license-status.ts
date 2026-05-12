/**
 * License Status Verification
 * =============================
 * Reads PUBLIC license-lookup pages exposed by state veterinary boards
 * and returns a normalized `{ status, license_number, expiration }` per
 * candidate. Currently implemented for the two boards most relevant to
 * Green Dog Animal Hospital recruiting: California (DCA / VMB) and
 * Texas (TBVME).
 *
 * The boards have no official APIs — we parse the public HTML the same
 * way a recruiter would in a browser. Be polite (1 req / candidate) and
 * always present the canonical URL alongside any parsed status.
 */

import { logger } from './logger'
import { getAppUrl } from './appUrl'
import { searchCaliforniaVmb } from './state-vet-boards'

export type LicenseStatusValue = 'active' | 'inactive' | 'expired' | 'lapsed' | 'suspended' | 'revoked' | 'unknown'

export interface LicenseStatus {
  status: LicenseStatusValue
  license_number?: string | null
  expiration_date?: string | null
  full_name?: string | null
  source_url: string
  raw_status?: string | null
}

function userAgent(): string {
  return `EmployeeGM-GreenDog/1.0 (verification; ${getAppUrl()})`
}

function normalizeStatus(raw?: string | null): LicenseStatusValue {
  if (!raw) return 'unknown'
  const s = raw.toLowerCase()
  if (/clear|active|current|valid|good standing/.test(s)) return 'active'
  if (/expired/.test(s)) return 'expired'
  if (/lapsed/.test(s)) return 'lapsed'
  if (/suspend/.test(s)) return 'suspended'
  if (/revoke|cancell?ed|denied/.test(s)) return 'revoked'
  if (/inactive|retired|delinquent/.test(s)) return 'inactive'
  return 'unknown'
}

// ─────────────────────────────────────────────────────────────────────────────
// California (already scrapeable via state-vet-boards.ts)
// ─────────────────────────────────────────────────────────────────────────────
async function lookupCalifornia(firstName: string, lastName: string): Promise<LicenseStatus | null> {
  try {
    const rows = await searchCaliforniaVmb({ firstName, lastName })
    if (!rows.length) return null
    // Prefer the first "Clear" row; fall back to the top row.
    const preferred = rows.find(r => /clear|active|current/i.test(r.status ?? '')) ?? rows[0]!
    return {
      status: normalizeStatus(preferred.status),
      license_number: preferred.licenseNumber,
      expiration_date: preferred.expirationDate ?? null,
      full_name: preferred.fullName,
      source_url: preferred.detailUrl ?? 'https://search.dca.ca.gov/',
      raw_status: preferred.status ?? null,
    }
  } catch (err) {
    logger.warn(`CA license lookup failed: ${(err as Error).message}`, 'license-status')
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Texas (TBVME)
//
// The Texas Board of Veterinary Medical Examiners exposes a public search
// at https://vetlicensesearch.tbvme.texas.gov/ which renders an HTML
// results table. We submit a GET against its `Default.aspx` with the
// last + first name in the standard query-string controls.
// ─────────────────────────────────────────────────────────────────────────────
async function lookupTexas(firstName: string, lastName: string): Promise<LicenseStatus | null> {
  const url = `https://vetlicensesearch.tbvme.texas.gov/?ln=${encodeURIComponent(lastName)}&fn=${encodeURIComponent(firstName)}`
  let html = ''
  try {
    html = await $fetch<string>(url, {
      method: 'GET',
      headers: { 'User-Agent': userAgent(), Accept: 'text/html' },
      timeout: 15_000,
      responseType: 'text',
    } as any)
  } catch (err) {
    logger.warn(`TX license lookup HTTP failure: ${(err as Error).message}`, 'license-status')
    return null
  }
  if (!html || typeof html !== 'string') return null

  // TBVME results are rendered as a <table> with columns:
  // License # | Name | License Type | Status | Expiration | City
  // We grab the first row whose name contains both first and last name.
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

  let row: RegExpExecArray | null
  while ((row = rowRe.exec(html)) !== null) {
    const cells: string[] = []
    let cell: RegExpExecArray | null
    while ((cell = cellRe.exec(row[1]!)) !== null) cells.push(stripHtml(cell[1]!))
    if (cells.length < 5) continue
    const [licenseNumber, name, licenseType, status, expiration, city] = cells
    if (!name || !/veterinarian/i.test(licenseType ?? '')) continue
    const ln = lastName.toLowerCase()
    const fn = firstName.toLowerCase()
    if (!name.toLowerCase().includes(ln) || !name.toLowerCase().includes(fn)) continue
    return {
      status: normalizeStatus(status),
      license_number: licenseNumber || null,
      expiration_date: expiration || null,
      full_name: name,
      source_url: url,
      raw_status: status ?? null,
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Verify a veterinarian's license status. Returns null for states we
 * don't yet support (caller should fall back to the canonical board URL).
 */
export async function lookupLicenseStatus(
  state: string,
  firstName: string,
  lastName: string,
): Promise<LicenseStatus | null> {
  if (!state || !firstName || !lastName) return null
  const s = state.toUpperCase()
  if (s === 'CA') return lookupCalifornia(firstName, lastName)
  if (s === 'TX') return lookupTexas(firstName, lastName)
  return null
}

export function licenseStatusBoost(status: LicenseStatusValue | null | undefined): number {
  switch (status) {
    case 'active': return 15
    case 'inactive': return -10
    case 'expired': return -20
    case 'lapsed': return -20
    case 'suspended': return -50
    case 'revoked': return -100
    default: return 0
  }
}
