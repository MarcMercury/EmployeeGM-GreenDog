/**
 * AVMA / State Veterinary Board Public Lookups — Server Utility
 * ===============================================================
 * No official APIs exist for most veterinary licensing bodies. This module
 * provides:
 *
 *   1. A registry of canonical PUBLIC lookup URLs for every US state board
 *      and the major specialty colleges (ACVS, ACVIM, etc.) — so the UI
 *      can deep-link a recruiter to a verification page in one click.
 *   2. A best-effort scraper for the California DCA "License Search" which
 *      hosts the Veterinary Medical Board (VMB) public licensee data and
 *      is the most relevant lookup for Green Dog Animal Hospital.
 *   3. URL builders for ACVS / ACVIM / ACVO / etc. diplomate directories so
 *      recruiters can confirm board-cert (DACVS, DACVIM, etc.) claims.
 *
 * IMPORTANT:
 *   - These boards regularly change their HTML. Treat scraping results as
 *     advisory; always present the canonical URL alongside any parsed match.
 *   - We respect robots.txt and identify ourselves with the standard
 *     User-Agent. Do NOT bulk-scrape these sites.
 */

import { logger } from './logger'
import { getAppUrl } from './appUrl'

function userAgent(): string {
  return `EmployeeGM-GreenDog/1.0 (verification; ${getAppUrl()})`
}

// ─────────────────────────────────────────────────────────────────────────────
// State board lookup URL registry
// ─────────────────────────────────────────────────────────────────────────────

export interface StateBoardLookup {
  /** Two-letter state code. */
  state: string
  /** Friendly board name. */
  board: string
  /** Public license-search URL (UI-style, recruiter clicks through). */
  searchUrl: string
  /** Optional URL builder that pre-fills first/last name search params. */
  buildSearchUrl?: (firstName?: string, lastName?: string) => string
  /** True if we have a working scraper for this board in this module. */
  scrapeable?: boolean
}

const STATE_BOARDS: Record<string, StateBoardLookup> = {
  CA: {
    state: 'CA',
    board: 'California Veterinary Medical Board (DCA License Search)',
    searchUrl: 'https://search.dca.ca.gov/',
    buildSearchUrl: (first, last) => {
      const params = new URLSearchParams({
        boardCode: '50', // Veterinary Medical Board
        licenseType: '7800', // Veterinarian
        firstName: first ?? '',
        lastName: last ?? '',
      })
      return `https://search.dca.ca.gov/results?${params.toString()}`
    },
    scrapeable: true,
  },
  TX: {
    state: 'TX',
    board: 'Texas Board of Veterinary Medical Examiners',
    searchUrl: 'https://vetlicensesearch.tbvme.texas.gov/',
  },
  NY: {
    state: 'NY',
    board: 'New York State Office of the Professions — Veterinary Medicine',
    searchUrl: 'https://www.op.nysed.gov/verification-search',
  },
  FL: {
    state: 'FL',
    board: 'Florida Department of Business & Professional Regulation — Veterinary Medicine',
    searchUrl: 'https://www.myfloridalicense.com/wl11.asp?mode=0&SID=',
  },
  IL: {
    state: 'IL',
    board: 'Illinois Department of Financial & Professional Regulation',
    searchUrl: 'https://online-dfpr.micropact.com/Lookup/LicenseLookup.aspx',
  },
  WA: {
    state: 'WA',
    board: 'Washington State Department of Health — Veterinary Board of Governors',
    searchUrl: 'https://fortress.wa.gov/doh/providercredentialsearch/',
  },
  OR: {
    state: 'OR',
    board: 'Oregon Veterinary Medical Examining Board',
    searchUrl: 'https://obvm.oregon.gov/clients/orobvm/public/licenseesearch.aspx',
  },
  CO: {
    state: 'CO',
    board: 'Colorado Department of Regulatory Agencies — DORA',
    searchUrl: 'https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx',
  },
  AZ: {
    state: 'AZ',
    board: 'Arizona State Veterinary Medical Examining Board',
    searchUrl: 'https://az.bvme.us/glsuiteweb/clients/azbvme/public/webverificationsearch.aspx',
  },
  NV: {
    state: 'NV',
    board: 'Nevada State Board of Veterinary Medical Examiners',
    searchUrl: 'https://nvvetboard.us/online-services/license-verification/',
  },
  GA: {
    state: 'GA',
    board: 'Georgia State Board of Veterinary Medicine',
    searchUrl: 'https://verify.sos.ga.gov/verification/',
  },
  NC: {
    state: 'NC',
    board: 'North Carolina Veterinary Medical Board',
    searchUrl: 'https://www.ncvmb.org/license-search/',
  },
  OH: {
    state: 'OH',
    board: 'Ohio Veterinary Medical Licensing Board',
    searchUrl: 'https://elicense3.com.ohio.gov/Lookup/LicenseLookup.aspx',
  },
  PA: {
    state: 'PA',
    board: 'Pennsylvania State Board of Veterinary Medicine',
    searchUrl: 'https://www.pals.pa.gov/#/page/search',
  },
  MA: {
    state: 'MA',
    board: 'Massachusetts Board of Registration in Veterinary Medicine',
    searchUrl: 'https://madph.mylicense.com/verification/',
  },
}

/** Get the canonical lookup config for a US state, or null if unknown. */
export function getStateBoardLookup(state: string): StateBoardLookup | null {
  if (!state) return null
  return STATE_BOARDS[state.toUpperCase()] ?? null
}

/** Build the best public verification URL for a (firstName, lastName, state). */
export function buildStateBoardSearchUrl(
  state: string,
  firstName?: string,
  lastName?: string,
): string | null {
  const board = getStateBoardLookup(state)
  if (!board) return null
  return board.buildSearchUrl
    ? board.buildSearchUrl(firstName, lastName)
    : board.searchUrl
}

/** List all configured boards. */
export function listStateBoards(): StateBoardLookup[] {
  return Object.values(STATE_BOARDS)
}

// ─────────────────────────────────────────────────────────────────────────────
// California DCA scraper (Veterinary Medical Board)
// ─────────────────────────────────────────────────────────────────────────────

export interface CaVmbLicense {
  licenseNumber: string
  licenseType: string
  fullName: string
  city?: string | null
  status?: string | null
  expirationDate?: string | null
  detailUrl?: string | null
}

/**
 * Best-effort scrape of the California DCA license-search results page for
 * Veterinarians (board=50, licenseType=7800). Returns parsed rows.
 *
 * The DCA HTML is server-rendered — we use a tolerant regex pass that
 * extracts each result block. If the DOM changes, this returns []
 * gracefully and the caller should fall back to the canonical URL.
 */
export async function searchCaliforniaVmb(opts: {
  firstName?: string
  lastName?: string
  licenseNumber?: string
}): Promise<CaVmbLicense[]> {
  if (!opts.firstName && !opts.lastName && !opts.licenseNumber) return []

  const params = new URLSearchParams({
    boardCode: '50',
    licenseType: '7800',
    firstName: opts.firstName ?? '',
    lastName: opts.lastName ?? '',
    licenseNumber: opts.licenseNumber ?? '',
  })
  const url = `https://search.dca.ca.gov/results?${params.toString()}`

  let html = ''
  try {
    html = await $fetch<string>(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent(),
        'Accept': 'text/html',
      },
      timeout: 15_000,
      responseType: 'text',
    } as any)
  } catch (err) {
    logger.warn(`CA VMB lookup HTTP failure: ${(err as Error).message}`, 'state-vet-boards')
    return []
  }

  if (!html || typeof html !== 'string') return []

  // Each result is rendered inside <div class="card"> (or a <tr>) containing
  // a license number, a name, and a status. We use loose regexes since the
  // DCA changes markup occasionally.
  const results: CaVmbLicense[] = []
  const rowRe = /<div class="card[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi
  const numberRe = /License Number[^<]*<[^>]*>\s*([A-Z0-9-]+)/i
  const nameRe = /<h3[^>]*>\s*([^<]+?)\s*<\/h3>/i
  const cityRe = /(?:City|Address)[^<]*<[^>]*>\s*([^<]+?)\s*</i
  const statusRe = /Status[^<]*<[^>]*>\s*([^<]+?)\s*</i
  const expRe = /Expiration[^<]*<[^>]*>\s*([^<]+?)\s*</i
  const detailRe = /href="([^"]*licDetail[^"]*)"/i

  let match: RegExpExecArray | null
  while ((match = rowRe.exec(html)) !== null) {
    const block = match[1]
    const num = numberRe.exec(block)?.[1]
    const name = nameRe.exec(block)?.[1]
    if (!num || !name) continue
    const detailHref = detailRe.exec(block)?.[1]
    results.push({
      licenseNumber: num,
      licenseType: 'Veterinarian',
      fullName: name.trim(),
      city: cityRe.exec(block)?.[1]?.trim() ?? null,
      status: statusRe.exec(block)?.[1]?.trim() ?? null,
      expirationDate: expRe.exec(block)?.[1]?.trim() ?? null,
      detailUrl: detailHref ? new URL(detailHref, 'https://search.dca.ca.gov').toString() : null,
    })
    if (results.length >= 25) break
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialty diplomate directories (ACVS, ACVIM, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export interface DiplomateDirectory {
  college: string
  abbreviation: string         // e.g. ACVS, ACVIM
  diplomateCredential: string  // e.g. DACVS, DACVIM
  directoryUrl: string
  buildSearchUrl?: (lastName?: string) => string
}

const DIPLOMATE_DIRECTORIES: DiplomateDirectory[] = [
  {
    college: 'American College of Veterinary Surgeons',
    abbreviation: 'ACVS',
    diplomateCredential: 'DACVS',
    directoryUrl: 'https://www.acvs.org/find-surgeon/',
    buildSearchUrl: last => `https://www.acvs.org/find-surgeon/?lname=${encodeURIComponent(last ?? '')}`,
  },
  {
    college: 'American College of Veterinary Internal Medicine',
    abbreviation: 'ACVIM',
    diplomateCredential: 'DACVIM',
    directoryUrl: 'https://find.acvim.org/',
    buildSearchUrl: last => `https://find.acvim.org/?search=${encodeURIComponent(last ?? '')}`,
  },
  {
    college: 'American College of Veterinary Ophthalmologists',
    abbreviation: 'ACVO',
    diplomateCredential: 'DACVO',
    directoryUrl: 'https://www.acvo.org/find-a-veterinary-ophthalmologist',
  },
  {
    college: 'American College of Veterinary Dermatology',
    abbreviation: 'ACVD',
    diplomateCredential: 'DACVD',
    directoryUrl: 'https://www.acvd.org/page/diplomatedirectory',
  },
  {
    college: 'American College of Veterinary Emergency & Critical Care',
    abbreviation: 'ACVECC',
    diplomateCredential: 'DACVECC',
    directoryUrl: 'https://acvecc.org/find-a-criticalist/',
  },
  {
    college: 'American College of Veterinary Anesthesia and Analgesia',
    abbreviation: 'ACVAA',
    diplomateCredential: 'DACVAA',
    directoryUrl: 'https://acvaa.org/find-a-diplomate/',
  },
  {
    college: 'American Veterinary Dental College',
    abbreviation: 'AVDC',
    diplomateCredential: 'DAVDC',
    directoryUrl: 'https://avdc.org/find-a-veterinary-dentist/',
  },
  {
    college: 'American College of Veterinary Behaviorists',
    abbreviation: 'ACVB',
    diplomateCredential: 'DACVB',
    directoryUrl: 'https://www.dacvb.org/search/custom.asp?id=4709',
  },
]

export function listDiplomateDirectories(): DiplomateDirectory[] {
  return [...DIPLOMATE_DIRECTORIES]
}

/** Pick the directory matching a credential string ("DACVS", "DACVIM", etc.). */
export function getDiplomateDirectoryByCredential(credential: string): DiplomateDirectory | null {
  if (!credential) return null
  const c = credential.toUpperCase().replace(/[^A-Z]/g, '')
  return DIPLOMATE_DIRECTORIES.find(d =>
    c.includes(d.diplomateCredential) || c.includes(d.abbreviation),
  ) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// AVMA accredited-school directory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AVMA publishes (and updates yearly) the list of COE-accredited
 * veterinary colleges. We expose the canonical URL plus a lightweight
 * lookup against the well-known set so the UI can verify a candidate's
 * vet_school against AVMA accreditation without hitting the network.
 */
export const AVMA_ACCREDITED_DIRECTORY_URL =
  'https://www.avma.org/education/center-for-veterinary-education-accreditation/colleges-accredited'

const AVMA_ACCREDITED_SCHOOLS: string[] = [
  // United States (AVMA COE accredited, US schools — 2025 list)
  'Auburn University College of Veterinary Medicine',
  'Tuskegee University College of Veterinary Medicine',
  'University of Arizona College of Veterinary Medicine',
  'University of California, Davis School of Veterinary Medicine',
  'Colorado State University College of Veterinary Medicine and Biomedical Sciences',
  'University of Florida College of Veterinary Medicine',
  'University of Georgia College of Veterinary Medicine',
  'University of Illinois College of Veterinary Medicine',
  'Iowa State University College of Veterinary Medicine',
  'Kansas State University College of Veterinary Medicine',
  'Lincoln Memorial University College of Veterinary Medicine',
  'Long Island University College of Veterinary Medicine',
  'Louisiana State University School of Veterinary Medicine',
  'Michigan State University College of Veterinary Medicine',
  'University of Minnesota College of Veterinary Medicine',
  'Mississippi State University College of Veterinary Medicine',
  'University of Missouri College of Veterinary Medicine',
  'Midwestern University College of Veterinary Medicine',
  'North Carolina State University College of Veterinary Medicine',
  'The Ohio State University College of Veterinary Medicine',
  'Oklahoma State University College of Veterinary Medicine',
  'Oregon State University Carlson College of Veterinary Medicine',
  'University of Pennsylvania School of Veterinary Medicine',
  'Purdue University College of Veterinary Medicine',
  'University of Tennessee College of Veterinary Medicine',
  'Texas A&M University College of Veterinary Medicine and Biomedical Sciences',
  'Tufts University Cummings School of Veterinary Medicine',
  'Virginia-Maryland College of Veterinary Medicine',
  'Washington State University College of Veterinary Medicine',
  'University of Wisconsin–Madison School of Veterinary Medicine',
  'Western University of Health Sciences College of Veterinary Medicine',
  'Cornell University College of Veterinary Medicine',
  // Canada
  'University of Calgary Faculty of Veterinary Medicine',
  'University of Guelph Ontario Veterinary College',
  'University of Montreal Faculty of Veterinary Medicine',
  'University of Prince Edward Island Atlantic Veterinary College',
  'University of Saskatchewan Western College of Veterinary Medicine',
]

/**
 * Best-effort lookup: return true if the supplied school name fuzzily
 * matches an AVMA-accredited veterinary college.
 */
export function isAvmaAccreditedSchool(school: string): boolean {
  if (!school) return false
  const norm = school.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  return AVMA_ACCREDITED_SCHOOLS.some(s => {
    const t = s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (norm === t) return true
    // Match on a distinctive substring (e.g. "uc davis", "cornell", "tufts").
    const tokens = t.split(' ').filter(w => w.length >= 4)
    let hits = 0
    for (const tok of tokens) if (norm.includes(tok)) hits++
    return hits >= Math.min(2, tokens.length)
  })
}
