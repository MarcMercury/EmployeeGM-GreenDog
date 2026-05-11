/**
 * ACVS (American College of Veterinary Surgeons) Diplomate Directory.
 *
 * This is the authoritative public list of board-certified veterinary
 * surgeons (DACVS) in the U.S. and Canada. Two surfaces are useful:
 *
 *   1. Find-a-surgeon HTML form:
 *        https://online.acvs.org/acvsssa/rflssareferral.query_page?P_VENDOR_TY=VETS
 *      → POSTs to `rflssareferral.result_page` and returns a list of
 *        surgeons with name, address, phone, fax, and (when published)
 *        email. We submit the form server-side, parse the resulting
 *        HTML, and surface every surgeon found.
 *
 *   2. Public ACVS find-surgeon landing page (acvs.org) — kept for
 *      grounding citations only.
 *
 * The endpoint requires a fresh `p_session_serno` for every search, so
 * we always do a two-step fetch (GET query_page → POST result_page) and
 * persist the session cookie across both calls.
 */

import { logger } from './logger'

const ACVS_BASE = 'https://online.acvs.org/acvsssa'
const ACVS_QUERY_URL = `${ACVS_BASE}/rflssareferral.query_page?P_VENDOR_TY=VETS`
const ACVS_RESULT_URL = `${ACVS_BASE}/rflssareferral.result_page`

export type AcvsSpeciesCode = 'SA_PRACT' | 'EQ_PRACT' | 'LA_PRACT' | 'FA_PRACT'

export interface AcvsSearchInput {
  /** Two-letter US state / Canadian province code (e.g. "CA"). */
  state?: string
  /** ZIP / postal code. */
  zip?: string
  /** Free-form city. */
  city?: string
  /** Distance band in miles. Only specific values are accepted by the form:
   *  3, 5, 10, 25, 50, 100, 250, 500. */
  distanceMiles?: 3 | 5 | 10 | 25 | 50 | 100 | 250 | 500
  /** Species filter (multi-select). Defaults to Small Animal. */
  species?: AcvsSpeciesCode[]
  /** First name fragment (optional). */
  firstName?: string
  /** Last name fragment (optional). */
  lastName?: string
  /** Cap on results to return; the ACVS UI allows ALL. */
  maxResults?: number
}

export interface AcvsSurgeon {
  /** Raw display string, e.g. "Jacob Scott Aiello, BS, DVM, DACVS (SA)". */
  display_name: string
  first_name: string
  last_name: string
  /** Credential cluster, e.g. "DVM, DACVS (SA)". */
  credentials: string | null
  /** Single-line address from the directory (may include suite + city/state/ZIP). */
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  fax: string | null
  email: string | null
  /** ACVS internal vendor record id (used to construct the profile URL). */
  vendor_serno: string | null
  /** Direct link to the ACVS profile page when vendor_serno is known. */
  profile_url: string | null
  /** Species qualifications parsed from the credential cluster: "(SA)" / "(LA)" / "(EQ)". */
  species: ('SA' | 'LA' | 'EQ' | 'FA')[]
}

function distanceOption(d?: number): string {
  if (!d) return ''
  const allowed = [3, 5, 10, 25, 50, 100, 250, 500]
  // Snap to the nearest allowed bucket.
  const snapped = allowed.reduce((best, v) =>
    Math.abs(v - d) < Math.abs(best - d) ? v : best, allowed[0]!)
  return String(snapped)
}

function parseSessionSerno(html: string): string | null {
  const m = html.match(/name="p_session_serno"\s+value="(\d+)"/)
  return m ? m[1]! : null
}

function parseAddressLine(addr: string | null): { city: string | null; state: string | null; zip: string | null } {
  if (!addr) return { city: null, state: null, zip: null }
  // Typical: "3561 Morningside Dr<br>El Sobrante, CA 94803-2520<br>"
  // After tag stripping → "3561 Morningside Dr El Sobrante, CA 94803-2520"
  const cleaned = addr.replace(/\s+/g, ' ').trim()
  const m = cleaned.match(/([A-Za-z .'\-]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
  if (!m) return { city: null, state: null, zip: null }
  return { city: m[1]!.trim(), state: m[2]!, zip: m[3]! }
}

function splitName(display: string): { first: string; last: string; credentials: string | null; species: AcvsSurgeon['species'] } {
  // Example: "Jacob Scott Aiello, BS, DVM, DACVS (SA)"
  // Strategy: split on the first comma. Everything before is name; the rest is creds.
  const firstComma = display.indexOf(',')
  const nameSection = firstComma >= 0 ? display.slice(0, firstComma).trim() : display.trim()
  const credSection = firstComma >= 0 ? display.slice(firstComma + 1).trim() : ''

  const parts = nameSection.split(/\s+/).filter(Boolean)
  const first = parts[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1]! : ''

  const species: AcvsSurgeon['species'] = []
  if (/\(SA\)/i.test(credSection)) species.push('SA')
  if (/\(LA\)/i.test(credSection)) species.push('LA')
  if (/\(EQ\)/i.test(credSection)) species.push('EQ')
  if (/\(FA\)/i.test(credSection)) species.push('FA')

  return {
    first,
    last,
    credentials: credSection || null,
    species,
  }
}

function stripTagsKeepBreaks(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function parseResults(html: string, max = 200): AcvsSurgeon[] {
  const out: AcvsSurgeon[] = []
  // Each result is a <div class="aaRflResultWrapper">…</div> block.
  // The block ends with `<!-- close div class="aaRflResultWrapper" -->`
  // which we use as a reliable terminator.
  const blocks = html.split(/<!--\s*close div class="aaRflResultWrapper"\s*-->/i)
  for (const block of blocks) {
    const wrapIdx = block.indexOf('aaRflResultWrapper')
    if (wrapIdx < 0) continue
    const inner = block.slice(wrapIdx)

    // Drill-down link contains the surgeon name.
    const nameMatch = inner.match(/aaRflResultDrillDown[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!nameMatch) continue
    const href = nameMatch[1]!
    const displayRaw = stripTagsKeepBreaks(nameMatch[2]!).replace(/\s+/g, ' ').trim()
    if (!displayRaw) continue

    const vendorMatch = href.match(/p_vendor_serno=(\d+)/)
    const vendor_serno = vendorMatch ? vendorMatch[1]! : null
    const profile_url = vendor_serno
      ? `${ACVS_BASE}/rflcustomdisplay.detail_page?p_vendor_serno=${vendor_serno}`
      : null

    const addrMatch = inner.match(/aaRflResultAddr[^>]*>([\s\S]*?)<\/li>/i)
    const phoneMatch = inner.match(/aaRflResultPhone[^>]*>[\s\S]*?<\/label>([\s\S]*?)<\/li>/i)
    const faxMatch = inner.match(/aaRflResultFax[^>]*>[\s\S]*?<\/label>([\s\S]*?)<\/li>/i)
    const emailMatch = inner.match(/aaRflResultEmail[^>]*>[\s\S]*?mailto:([^"]+)"/i)

    const addrText = addrMatch ? stripTagsKeepBreaks(addrMatch[1]!).replace(/\s+/g, ' ').trim() : null
    const { city, state, zip } = parseAddressLine(addrText)

    const { first, last, credentials, species } = splitName(displayRaw)
    if (!first || !last) continue

    out.push({
      display_name: displayRaw,
      first_name: first,
      last_name: last,
      credentials,
      address: addrText,
      city,
      state,
      zip,
      phone: phoneMatch ? phoneMatch[1]!.trim() : null,
      fax: faxMatch ? faxMatch[1]!.trim() : null,
      email: emailMatch ? emailMatch[1]!.trim() : null,
      vendor_serno,
      profile_url,
      species,
    })

    if (out.length >= max) break
  }
  return out
}

/**
 * Submit the ACVS find-a-surgeon form server-side and return parsed results.
 *
 * Free, no API key required. Best-effort: returns [] on any error rather
 * than throwing, because this is meant to enrich a multi-provider search.
 */
export async function searchAcvsDirectory(input: AcvsSearchInput): Promise<AcvsSurgeon[]> {
  try {
    // Step 1: GET the query page to capture the CSRF-ish session_serno.
    const queryPage = await $fetch<string>(ACVS_QUERY_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GreenDogVetRecruiter/1.0; +https://www.employeegmgreendog.com)',
        accept: 'text/html,application/xhtml+xml',
      },
      timeout: 12000,
      // @ts-expect-error nitro $fetch supports responseType at runtime
      responseType: 'text',
    })

    const session = parseSessionSerno(queryPage)
    if (!session) {
      logger.warn('ACVS query page returned no session_serno', 'acvs-directory')
      return []
    }

    // Step 2: POST the form with filters.
    const species = input.species && input.species.length ? input.species : (['SA_PRACT'] as AcvsSpeciesCode[])
    const params = new URLSearchParams()
    params.set('p_session_serno', session)
    params.set('p_cust_id', '')
    params.set('p_vendor_ty', 'VETS')
    params.set('p_query_ty', 'QUERY_PAGE')
    params.set('p_city_nm', input.city || '')
    params.set('p_state_cd', input.state || '')
    params.set('p_zip', input.zip || '')
    params.set('p_country_cd', 'USA')
    params.set('p_distance', distanceOption(input.distanceMiles))
    params.set('p_first_nm', input.firstName || '')
    params.set('p_last_nm', input.lastName || '')
    for (const s of species) params.append('p_attribute_cd1', s)
    params.set('p_page_size', String(Math.min(Math.max(input.maxResults ?? 100, 5), 500)))

    const result = await $fetch<string>(ACVS_RESULT_URL, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GreenDogVetRecruiter/1.0; +https://www.employeegmgreendog.com)',
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html,application/xhtml+xml',
        referer: ACVS_QUERY_URL,
      },
      timeout: 15000,
      // @ts-expect-error nitro $fetch supports responseType at runtime
      responseType: 'text',
    })

    const parsed = parseResults(result, input.maxResults ?? 200)
    logger.info(`ACVS directory returned ${parsed.length} surgeon(s)`, 'acvs-directory')
    return parsed
  } catch (err) {
    logger.warn(`ACVS directory fetch failed: ${(err as Error).message}`, 'acvs-directory')
    return []
  }
}

export const ACVS_DIRECTORY_URL = ACVS_QUERY_URL
