/**
 * VIRMP — Veterinary Internship and Residency Matching Program.
 *
 * The 2026 VIRMP Match Summary (https://www.virmp.org/files/Match2026Summary.pdf)
 * does not list individual candidate names, but it provides two pieces of
 * data we use to better target residency-matching candidates:
 *
 *   1. A canonical list of residency-program SPECIALTY CATEGORIES (e.g.
 *      "SMALL ANIMAL SURGERY", "EMERGENCY MEDICINE/CRITICAL CARE"). We
 *      map our free-form specialty input to one or more VIRMP categories
 *      so the LLMs / web-search queries can target the right talent pool.
 *
 *   2. A list of vet SCHOOLS whose graduates apply through VIRMP every
 *      year. These are the "talent feeder" institutions — when sourcing
 *      a board-certified candidate, prospects from these schools are
 *      statistically more likely to be residency-trained or
 *      residency-bound.
 *
 * Source: VIRMP Match 2026 Summary (PDF), tables "By Graduating
 * Veterinary School" and "Residencies by Category" / "Internships by
 * Category".
 */

export interface VirmpCategoryMatch {
  /** Specialty category exactly as published by VIRMP. */
  category: string
  /** Discipline group: residency vs internship. */
  kind: 'residency' | 'internship'
  /** ABMS-style specialist credential a successful match earns toward. */
  diplomateCredential: string | null
}

/** Residency program categories listed in the VIRMP 2026 Match Summary. */
export const VIRMP_RESIDENCY_CATEGORIES: VirmpCategoryMatch[] = [
  { category: 'ANESTHESIA',                          kind: 'residency', diplomateCredential: 'DACVAA' },
  { category: 'CARDIOLOGY',                          kind: 'residency', diplomateCredential: 'DACVIM (Cardiology)' },
  { category: 'DENTISTRY',                           kind: 'residency', diplomateCredential: 'DAVDC' },
  { category: 'DERMATOLOGY',                         kind: 'residency', diplomateCredential: 'DACVD' },
  { category: 'DIAGNOSTIC IMAGING AND RADIOLOGY',    kind: 'residency', diplomateCredential: 'DACVR' },
  { category: 'EMERGENCY MEDICINE/CRITICAL CARE',    kind: 'residency', diplomateCredential: 'DACVECC' },
  { category: 'EQUINE SURGERY',                      kind: 'residency', diplomateCredential: 'DACVS-LA' },
  { category: 'FOOD ANIMAL MEDICINE AND SURGERY',    kind: 'residency', diplomateCredential: 'DACVIM (LAIM) / DACVS-LA' },
  { category: 'NEUROLOGY/NEUROSURGERY',              kind: 'residency', diplomateCredential: 'DACVIM (Neurology)' },
  { category: 'ONCOLOGY',                            kind: 'residency', diplomateCredential: 'DACVIM (Oncology)' },
  { category: 'OPHTHALMOLOGY',                       kind: 'residency', diplomateCredential: 'DACVO' },
  { category: 'RADIATION ONCOLOGY/THERAPY',          kind: 'residency', diplomateCredential: 'DACVR (Radiation Oncology)' },
  { category: 'SURGERY - LARGE ANIMAL',              kind: 'residency', diplomateCredential: 'DACVS-LA' },
  { category: 'SURGERY - SMALL ANIMAL',              kind: 'residency', diplomateCredential: 'DACVS-SA' },
]

/** Internship program categories listed in the VIRMP 2026 Match Summary. */
export const VIRMP_INTERNSHIP_CATEGORIES: VirmpCategoryMatch[] = [
  { category: 'ANESTHESIOLOGY',                      kind: 'internship', diplomateCredential: null },
  { category: 'CARDIOLOGY',                          kind: 'internship', diplomateCredential: null },
  { category: 'DERMATOLOGY',                         kind: 'internship', diplomateCredential: null },
  { category: 'DIAGNOSTIC IMAGING AND RADIOLOGY',    kind: 'internship', diplomateCredential: null },
  { category: 'EMERGENCY MEDICINE/CRITICAL CARE',    kind: 'internship', diplomateCredential: null },
  { category: 'LARGE ANIMAL INTERNAL MEDICINE',      kind: 'internship', diplomateCredential: null },
  { category: 'LARGE ANIMAL SURGERY',                kind: 'internship', diplomateCredential: null },
  { category: 'NEUROLOGY',                           kind: 'internship', diplomateCredential: null },
  { category: 'ONCOLOGY',                            kind: 'internship', diplomateCredential: null },
  { category: 'OPHTHALMOLOGY',                       kind: 'internship', diplomateCredential: null },
  { category: 'SMALL ANIMAL INTERNAL MEDICINE',      kind: 'internship', diplomateCredential: null },
  { category: 'SMALL ANIMAL SURGERY',                kind: 'internship', diplomateCredential: null },
]

/**
 * Vet schools listed in the VIRMP 2026 Match Summary "By Graduating
 * Veterinary School" table. These institutions reliably send graduates
 * into residency / internship matches every year and are the strongest
 * source of residency-trained or residency-bound DVMs.
 */
export const VIRMP_FEEDER_SCHOOLS: string[] = [
  'University of Arizona',
  'Auburn University',
  'University of California, Davis',
  'Colorado State University',
  'University of Florida',
  'University of Georgia',
  'University of Illinois',
  'Iowa State University',
  'Kansas State University',
  'Lincoln Memorial University',
  'Long Island University',
  'Louisiana State University',
  'Michigan State University',
  'Midwestern University',
  'University of Minnesota',
  'Mississippi State University',
  'University of Missouri',
  'University of Montreal',
  'Cornell University',
  'North Carolina State University',
  'The Ohio State University',
  'Oklahoma State University',
  'University of Guelph (Ontario)',
  'Oregon State University',
  'University of Pennsylvania',
  'Atlantic Veterinary College (Prince Edward Island)',
  'Purdue University',
  'Ross University',
  'University of Saskatchewan (Western)',
  "St. George's University",
  "St. Matthew's University",
  'University of Tennessee',
  'Texas A&M University',
  'Texas Tech University',
  'Tufts University',
  'Tuskegee University',
  'Virginia-Maryland College of Veterinary Medicine',
  'Washington State University',
  'University of Wisconsin-Madison',
  'Western University of Health Sciences',
]

/**
 * Match a free-form specialty / keyword string against VIRMP residency
 * and internship categories. Returns whatever matches (possibly multiple
 * — e.g. "Surgery" matches both "SURGERY - SMALL ANIMAL" and "SURGERY -
 * LARGE ANIMAL"). Empty array if no match.
 */
export function matchVirmpCategories(specialty: string, keywords: string[] = []): VirmpCategoryMatch[] {
  const hay = [specialty, ...keywords].join(' ').toLowerCase()
  if (!hay.trim()) return []

  const all = [...VIRMP_RESIDENCY_CATEGORIES, ...VIRMP_INTERNSHIP_CATEGORIES]
  const synonyms: Array<{ test: RegExp; matchCategoryRe: RegExp }> = [
    { test: /\b(surgery|surgeon)\b/,                 matchCategoryRe: /SURGERY/i },
    { test: /\binternal medicine|internist\b/,       matchCategoryRe: /INTERNAL MEDICINE/i },
    { test: /\b(cardio)/,                            matchCategoryRe: /CARDIOLOGY/i },
    { test: /\b(onco)/,                              matchCategoryRe: /ONCOLOGY/i },
    { test: /\b(neuro)/,                             matchCategoryRe: /NEUROLOGY/i },
    { test: /\b(derm)/,                              matchCategoryRe: /DERMATOLOGY/i },
    { test: /\b(ophthal|eye)\b/,                     matchCategoryRe: /OPHTHALMOLOGY/i },
    { test: /\b(dent)/,                              matchCategoryRe: /DENTISTRY/i },
    { test: /\b(anesth)/,                            matchCategoryRe: /ANESTH/i },
    { test: /\b(radio|imaging|ultrasound|mri)\b/,    matchCategoryRe: /(RADIOLOGY|IMAGING)/i },
    { test: /\b(emergency|criticalist|critical care|ecc)\b/, matchCategoryRe: /EMERGENCY|CRITICAL/i },
    { test: /\b(equine)\b/,                          matchCategoryRe: /EQUINE/i },
    { test: /\b(food animal|large animal|cattle|dairy|swine|bovine)\b/, matchCategoryRe: /LARGE ANIMAL|FOOD ANIMAL/i },
  ]

  const matched = new Set<VirmpCategoryMatch>()
  for (const syn of synonyms) {
    if (syn.test.test(hay)) {
      for (const cat of all) {
        if (syn.matchCategoryRe.test(cat.category)) matched.add(cat)
      }
    }
  }
  // Direct substring match as a fallback.
  for (const cat of all) {
    const tokens = cat.category.toLowerCase().split(/[^a-z]+/).filter(t => t.length > 3)
    if (tokens.some(t => hay.includes(t))) matched.add(cat)
  }
  return Array.from(matched)
}

/** Returns true if `vetSchool` plausibly corresponds to a VIRMP feeder. */
export function isVirmpFeederSchool(vetSchool: string | null | undefined): boolean {
  if (!vetSchool) return false
  const v = vetSchool.toLowerCase()
  return VIRMP_FEEDER_SCHOOLS.some((s) => {
    const sl = s.toLowerCase()
    // Match on shortest distinctive tokens (e.g. "cornell", "uc davis", "auburn").
    const distinctive = sl
      .replace(/university|college|of|the|veterinary|medicine/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 3)
    return distinctive.some(t => v.includes(t))
  })
}

/** Build a short grounding block for LLM prompts that explains the
 *  VIRMP-derived context relevant to this search. */
export function buildVirmpGroundingBlock(specialty: string, keywords: string[] = []): string {
  const cats = matchVirmpCategories(specialty, keywords)
  if (!cats.length) return ''
  const lines = cats.map(c =>
    `- ${c.kind === 'residency' ? 'Residency' : 'Internship'} category: ${c.category}` +
    (c.diplomateCredential ? ` → ${c.diplomateCredential}` : ''))
  return `VIRMP MATCH 2026 CONTEXT (https://www.virmp.org/files/Match2026Summary.pdf):
The following VIRMP program categories are relevant to this search. Candidates
currently in or recently completing these programs are prime targets:
${lines.join('\n')}

Strongest candidate "feeder" schools (graduating veterinary schools whose
alumni enter the VIRMP match every year): ${VIRMP_FEEDER_SCHOOLS.slice(0, 25).join(', ')}.`
}
