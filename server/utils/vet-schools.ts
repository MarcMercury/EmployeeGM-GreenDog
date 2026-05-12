/**
 * AVMA-accredited Veterinary School Normalization
 * =================================================
 * Maps free-form vet school strings (LinkedIn "UCDSVM", "UC Davis", "Davis CVM",
 * "Texas A&M", etc.) to their canonical AVMA-accredited college name.
 *
 * Used by the DVM-candidate scout to normalize `vet_school` so we don't
 * end up with three rows for the same school spelled three different ways.
 */

import { logger } from './logger'

export interface VetSchool {
  /** Canonical full AVMA name. */
  canonical: string
  /** Country code. */
  country: 'US' | 'CA'
  /** Short label suitable for UI badges (e.g. "UC Davis SVM"). */
  short: string
  /** Strings that should resolve to this school (lowercase substring match). */
  aliases: string[]
}

const SCHOOLS: VetSchool[] = [
  // ── United States ──
  { canonical: 'Auburn University College of Veterinary Medicine', country: 'US', short: 'Auburn CVM',
    aliases: ['auburn', 'aubie'] },
  { canonical: 'Tuskegee University College of Veterinary Medicine', country: 'US', short: 'Tuskegee CVM',
    aliases: ['tuskegee'] },
  { canonical: 'University of Arizona College of Veterinary Medicine', country: 'US', short: 'Arizona CVM',
    aliases: ['university of arizona', 'u of a cvm', 'uarizona cvm', 'arizona vet'] },
  { canonical: 'University of California, Davis School of Veterinary Medicine', country: 'US', short: 'UC Davis SVM',
    aliases: ['uc davis', 'ucdavis', 'ucd svm', 'ucdsvm', 'davis school of veterinary', 'davis cvm', 'davis svm', 'uc-davis'] },
  { canonical: 'Colorado State University College of Veterinary Medicine and Biomedical Sciences', country: 'US', short: 'Colorado State CVMBS',
    aliases: ['colorado state', 'csu cvmbs', 'csu vet', 'fort collins vet'] },
  { canonical: 'University of Florida College of Veterinary Medicine', country: 'US', short: 'Florida CVM',
    aliases: ['university of florida', 'uf cvm', 'gainesville vet'] },
  { canonical: 'University of Georgia College of Veterinary Medicine', country: 'US', short: 'Georgia CVM',
    aliases: ['university of georgia', 'uga cvm', 'uga vet'] },
  { canonical: 'University of Illinois College of Veterinary Medicine', country: 'US', short: 'Illinois CVM',
    aliases: ['university of illinois', 'illinois urbana', 'illinois cvm', 'uiuc vet'] },
  { canonical: 'Iowa State University College of Veterinary Medicine', country: 'US', short: 'Iowa State CVM',
    aliases: ['iowa state', 'isu cvm', 'ames vet'] },
  { canonical: 'Kansas State University College of Veterinary Medicine', country: 'US', short: 'Kansas State CVM',
    aliases: ['kansas state', 'k-state cvm', 'ksu cvm', 'manhattan ks vet'] },
  { canonical: 'Lincoln Memorial University College of Veterinary Medicine', country: 'US', short: 'LMU CVM',
    aliases: ['lincoln memorial', 'lmu-cvm', 'lmu vet'] },
  { canonical: 'Long Island University College of Veterinary Medicine', country: 'US', short: 'LIU CVM',
    aliases: ['long island university', 'liu cvm', 'liu vet'] },
  { canonical: 'Louisiana State University School of Veterinary Medicine', country: 'US', short: 'LSU SVM',
    aliases: ['louisiana state', 'lsu svm', 'lsu vet'] },
  { canonical: 'Michigan State University College of Veterinary Medicine', country: 'US', short: 'Michigan State CVM',
    aliases: ['michigan state', 'msu cvm', 'msu vet', 'east lansing vet'] },
  { canonical: 'University of Minnesota College of Veterinary Medicine', country: 'US', short: 'Minnesota CVM',
    aliases: ['university of minnesota', 'umn cvm', 'umn vet'] },
  { canonical: 'Mississippi State University College of Veterinary Medicine', country: 'US', short: 'Mississippi State CVM',
    aliases: ['mississippi state', 'msstate cvm'] },
  { canonical: 'University of Missouri College of Veterinary Medicine', country: 'US', short: 'Missouri CVM',
    aliases: ['university of missouri', 'mizzou cvm', 'mu cvm'] },
  { canonical: 'Midwestern University College of Veterinary Medicine', country: 'US', short: 'Midwestern CVM',
    aliases: ['midwestern university', 'mwu cvm'] },
  { canonical: 'North Carolina State University College of Veterinary Medicine', country: 'US', short: 'NC State CVM',
    aliases: ['nc state', 'ncsu cvm', 'ncsu vet', 'north carolina state'] },
  { canonical: 'The Ohio State University College of Veterinary Medicine', country: 'US', short: 'Ohio State CVM',
    aliases: ['ohio state', 'osu cvm', 'osu vet', 'the ohio state'] },
  { canonical: 'Oklahoma State University College of Veterinary Medicine', country: 'US', short: 'Oklahoma State CVM',
    aliases: ['oklahoma state', 'okstate cvm', 'osu (oklahoma) cvm'] },
  { canonical: 'Oregon State University Carlson College of Veterinary Medicine', country: 'US', short: 'Oregon State CVM',
    aliases: ['oregon state', 'osu carlson', 'carlson cvm', 'oregon state cvm'] },
  { canonical: 'University of Pennsylvania School of Veterinary Medicine', country: 'US', short: 'Penn Vet',
    aliases: ['penn vet', 'university of pennsylvania school of veterinary', 'upenn vet'] },
  { canonical: 'Purdue University College of Veterinary Medicine', country: 'US', short: 'Purdue CVM',
    aliases: ['purdue'] },
  { canonical: 'University of Tennessee College of Veterinary Medicine', country: 'US', short: 'Tennessee CVM',
    aliases: ['university of tennessee', 'ut cvm', 'utk cvm'] },
  { canonical: 'Texas A&M University College of Veterinary Medicine and Biomedical Sciences', country: 'US', short: 'Texas A&M CVMBS',
    aliases: ['texas a&m', 'texas a and m', 'tamu cvm', 'tamu vet', 'aggie vet'] },
  { canonical: 'Tufts University Cummings School of Veterinary Medicine', country: 'US', short: 'Tufts Cummings',
    aliases: ['tufts', 'cummings school'] },
  { canonical: 'Virginia-Maryland College of Veterinary Medicine', country: 'US', short: 'Virginia-Maryland CVM',
    aliases: ['virginia-maryland', 'virginia maryland', 'vmcvm', 'virginia tech vet'] },
  { canonical: 'Washington State University College of Veterinary Medicine', country: 'US', short: 'Washington State CVM',
    aliases: ['washington state', 'wsu cvm', 'wsu vet', 'pullman vet'] },
  { canonical: 'University of Wisconsin–Madison School of Veterinary Medicine', country: 'US', short: 'Wisconsin SVM',
    aliases: ['university of wisconsin', 'uw madison svm', 'uw-madison vet', 'wisconsin svm'] },
  { canonical: 'Western University of Health Sciences College of Veterinary Medicine', country: 'US', short: 'WesternU CVM',
    aliases: ['western university', 'westernu cvm', 'western u vet'] },
  { canonical: 'Cornell University College of Veterinary Medicine', country: 'US', short: 'Cornell CVM',
    aliases: ['cornell'] },
  // ── Canada ──
  { canonical: 'University of Calgary Faculty of Veterinary Medicine', country: 'CA', short: 'Calgary UCVM',
    aliases: ['university of calgary', 'ucvm', 'calgary vet'] },
  { canonical: 'University of Guelph Ontario Veterinary College', country: 'CA', short: 'Guelph OVC',
    aliases: ['university of guelph', 'ontario veterinary college', 'ovc'] },
  { canonical: 'University of Montreal Faculty of Veterinary Medicine', country: 'CA', short: 'Montreal FMV',
    aliases: ['university of montreal', 'universite de montreal', 'fmv', 'st-hyacinthe'] },
  { canonical: 'University of Prince Edward Island Atlantic Veterinary College', country: 'CA', short: 'PEI AVC',
    aliases: ['atlantic veterinary college', 'upei avc', 'avc'] },
  { canonical: 'University of Saskatchewan Western College of Veterinary Medicine', country: 'CA', short: 'Saskatchewan WCVM',
    aliases: ['university of saskatchewan', 'western college of veterinary medicine', 'wcvm'] },
]

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Normalize a free-form vet school string to the canonical AVMA name +
 * short label. Returns null when no plausible match is found.
 */
export function normalizeVetSchool(input?: string | null): { canonical: string; short: string; country: 'US' | 'CA' } | null {
  if (!input) return null
  const needle = norm(input)
  if (!needle) return null

  // 1. Exact / substring match against full canonical names.
  for (const s of SCHOOLS) {
    if (norm(s.canonical) === needle) return { canonical: s.canonical, short: s.short, country: s.country }
    if (needle.includes(norm(s.canonical))) return { canonical: s.canonical, short: s.short, country: s.country }
  }

  // 2. Alias match (most aliases are short — accept substring either way).
  for (const s of SCHOOLS) {
    for (const a of s.aliases) {
      const na = norm(a)
      if (!na) continue
      if (needle === na || needle.includes(na) || na.includes(needle)) {
        return { canonical: s.canonical, short: s.short, country: s.country }
      }
    }
  }

  // 3. Heuristic: pick the school whose distinctive tokens overlap most.
  let best: { school: VetSchool; score: number } | null = null
  for (const s of SCHOOLS) {
    const tokens = norm(s.canonical).split(' ').filter(t => t.length >= 4 && !['college', 'university', 'school', 'veterinary', 'medicine', 'biomedical', 'sciences', 'faculty'].includes(t))
    let score = 0
    for (const t of tokens) if (needle.includes(t)) score++
    if (score >= 2 && (!best || score > best.score)) best = { school: s, score }
  }
  if (best) return { canonical: best.school.canonical, short: best.school.short, country: best.school.country }

  logger.info(`vet-schools: no AVMA match for "${input}"`, 'vet-schools')
  return null
}

export function listAvmaVetSchools(): VetSchool[] {
  return [...SCHOOLS]
}
