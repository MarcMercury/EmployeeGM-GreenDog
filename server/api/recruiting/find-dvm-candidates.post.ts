/**
 * AI-Driven DVM Candidate Discovery
 *
 * POST /api/recruiting/find-dvm-candidates
 *
 * Uses every connected LLM (OpenAI, Gemini) to scrub publicly available
 * sources (hospital staff pages, state DVM boards, AVMA, college boards,
 * recruiting sites, LinkedIn public profiles, etc.) and return a list of
 * candidate veterinarians and specialists matching the requested criteria.
 *
 * NOTES on data sources:
 *   - We do NOT scrape gated sites (LinkedIn full search, paid recruiting
 *     boards) without proper API credentials. Without those credentials the
 *     LLMs return only publicly indexed information.
 *   - To enrich results from gated sources you would need additional API
 *     keys (LinkedIn Talent / Recruiter, Indeed Hiring, ZipRecruiter, etc.).
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { agentChat } from '../../utils/agents/openai'
import { geminiGenerate } from '../../utils/gemini'
import { logger } from '../../utils/logger'
import { nominatimGeocode, distanceMiles } from '../../utils/nominatim'
import { verifyDvmInNpi, searchNpiProviders, type NpiResult } from '../../utils/npi-registry'
import {
  buildStateBoardSearchUrl,
  getDiplomateDirectoryByCredential,
  isAvmaAccreditedSchool,
} from '../../utils/state-vet-boards'
import { apolloPeopleSearch, apolloPeopleEnrich, type ApolloPerson } from '../../utils/apollo'
import { tavilySearch, tavilyExtract } from '../../utils/tavily'
import { googleSearch } from '../../utils/googleSearch'
import {
  searchAcvsDirectory,
  ACVS_DIRECTORY_URL,
  type AcvsSurgeon,
  type AcvsSpeciesCode,
} from '../../utils/acvs-directory'
import {
  matchVirmpCategories,
  isVirmpFeederSchool,
  buildVirmpGroundingBlock,
} from '../../utils/virmp-match'

// Credentials we recognize when scanning titles / LinkedIn content.
const VET_CREDENTIAL_RE = /\b(DVM|VMD|DACVS|DACVIM|DACVO|DACVD|DACVECC|DACVAA|DAVDC|DACVR|DACVB|DACVN|DACVPM|DACVSMR|DACZM|DACVM|DABVT|DACPV|DACT|DACVP|MRCVS|BVSc|BVMS|MS|MPH|PhD)\b/gi

function isMaskedEmail(email?: string | null): boolean {
  if (!email) return true
  return /email_not_unlocked|do_not_email|domain\.com$|hidden|locked/i.test(email)
}

interface SearchInput {
  specialty?: string          // e.g. "Surgery", "Internal Medicine", "General Practice"
  location?: string           // e.g. "Los Angeles, CA" or "California"
  radiusMiles?: number
  experienceMin?: number      // years
  keywords?: string[]         // free-form terms (e.g. "fear free", "ultrasound")
  includeSpecialists?: boolean
  includeNewGraduates?: boolean
  maxResults?: number
  /** When true, bias the search toward actively job-seeking candidates (job board postings, "open to work" signals). */
  activeOnly?: boolean
  /** When true, run free public-source verification (NPI, state board, AVMA school match) on each prospect and attach the results. */
  verify?: boolean
  /** When true, geocode each prospect's city/state via OSM Nominatim and drop those outside the radius. */
  enforceRadius?: boolean
}

export interface DvmProspect {
  first_name: string
  last_name: string
  credentials?: string         // DVM, VMD, DACVS, DACVIM, etc.
  specialty?: string | null
  current_employer?: string | null
  city?: string | null
  state?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  source_name?: string         // e.g. "AVMA directory", "Hospital staff page"
  source_url?: string          // citation
  experience_years?: number | null
  /** Veterinary school / college, e.g. "UC Davis SVM", "Cornell CVM". */
  vet_school?: string | null
  /** Year of DVM graduation if known. */
  graduation_year?: number | null
  /** Residency / internship program if known. */
  residency?: string | null
  /** True if discovered on an active job board posting / open-to-work listing. */
  actively_seeking?: boolean
  notes?: string | null
  match_score?: number         // 0-100, AI confidence in fit
  /** Specialty-alignment score (0-100). Higher = better fit for the
   *  requested specialty. Used as the primary sort key so DACVS results
   *  show up first when the user searches for "Surgeon", etc. */
  specialty_match?: number
  provider: 'openai' | 'gemini' | 'apollo' | 'npi' | 'tavily' | 'google_cse' | 'acvs' | 'merged'
  /** Distance from the search center in miles (populated when enforceRadius=true). */
  distance_miles?: number | null
  /** Free public-source verification (populated when verify=true). */
  verification?: {
    confidence: number
    reasons: string[]
    npi_matched: boolean
    npi_number?: string | null
    npi_is_veterinary: boolean
    state_board_url?: string | null
    diplomate_directory_url?: string | null
    avma_school_match: boolean | null
  } | null
}

const ALLOWED_ROLES = [
  'super_admin', 'admin', 'manager', 'hr_admin',
  'sup_admin', 'office_admin', 'marketing_admin',
]

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Please log in' })

  const authUserId = (user as any).sub || (user as any).id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Permission denied' })
  }

  const body = await readBody<SearchInput>(event)
  const input: Required<SearchInput> = {
    specialty: body.specialty?.trim() || 'General Practice',
    location: body.location?.trim() || 'Los Angeles, California',
    radiusMiles: body.radiusMiles ?? 50,
    experienceMin: body.experienceMin ?? 0,
    keywords: body.keywords?.filter(Boolean) ?? [],
    includeSpecialists: body.includeSpecialists ?? true,
    includeNewGraduates: body.includeNewGraduates ?? true,
    maxResults: Math.min(body.maxResults ?? 25, 50),
    activeOnly: body.activeOnly ?? false,
    verify: body.verify ?? false,
    enforceRadius: body.enforceRadius ?? false,
  }

  const config = useRuntimeConfig()
  const hasOpenAI = !!config.openaiApiKey
  const hasGemini = !!config.geminiApiKey
  const hasApollo = !!config.apolloApiKey
  const hasTavily = !!config.tavilyApiKey
  const hasGoogleCse = !!config.googleCseApiKey && !!config.googleCseId
  const hasNpi = true // free, no key

  if (!hasOpenAI && !hasGemini && !hasApollo && !hasTavily && !hasGoogleCse) {
    throw createError({
      statusCode: 503,
      message: 'No data providers configured.',
    })
  }

  const systemPrompt = buildSystemPrompt(input)
  const userPrompt = buildUserPrompt(input)

  const providerErrors: string[] = []

  // ── Stage 1: run all DIRECT data providers in parallel ──
  const [apolloRes, npiRes, tavilyRes, googleRes, directoryRes, acvsRes] = await Promise.all([
    hasApollo
      ? searchApolloDvms(input).catch(err => {
          providerErrors.push(`apollo: ${(err as Error).message}`)
          logger.error('Apollo DVM search failed', err as Error, 'find-dvm-candidates')
          return [] as DvmProspect[]
        })
      : Promise.resolve([] as DvmProspect[]),
    hasNpi
      ? searchNpiDvms(input).catch(err => {
          providerErrors.push(`npi: ${(err as Error).message}`)
          logger.error('NPI DVM search failed', err as Error, 'find-dvm-candidates')
          return [] as DvmProspect[]
        })
      : Promise.resolve([] as DvmProspect[]),
    hasTavily
      ? searchTavilyDvms(input).catch(err => {
          providerErrors.push(`tavily: ${(err as Error).message}`)
          logger.error('Tavily DVM search failed', err as Error, 'find-dvm-candidates')
          return { prospects: [] as DvmProspect[], snippets: [] as WebSnippet[] }
        })
      : Promise.resolve({ prospects: [] as DvmProspect[], snippets: [] as WebSnippet[] }),
    hasGoogleCse
      ? searchGoogleCseDvms(input).catch(err => {
          providerErrors.push(`google_cse: ${(err as Error).message}`)
          logger.error('Google CSE DVM search failed', err as Error, 'find-dvm-candidates')
          return { prospects: [] as DvmProspect[], snippets: [] as WebSnippet[] }
        })
      : Promise.resolve({ prospects: [] as DvmProspect[], snippets: [] as WebSnippet[] }),
    searchSpecialtyDirectories(input).catch(err => {
      providerErrors.push(`specialty_directories: ${(err as Error).message}`)
      logger.error('Specialty directory scrape failed', err as Error, 'find-dvm-candidates')
      return [] as DvmProspect[]
    }),
    searchAcvsDirectoryForInput(input).catch(err => {
      providerErrors.push(`acvs: ${(err as Error).message}`)
      logger.error('ACVS directory scrape failed', err as Error, 'find-dvm-candidates')
      return [] as DvmProspect[]
    }),
  ])

  logger.info(
    `Direct providers: apollo=${apolloRes.length} npi=${npiRes.length} tavily=${tavilyRes.prospects.length} google=${googleRes.prospects.length} directories=${directoryRes.length} acvs=${acvsRes.length}`,
    'find-dvm-candidates',
  )

  // Combine web snippets so LLMs have grounding context
  const webSnippets = [...tavilyRes.snippets, ...googleRes.snippets].slice(0, 30)
  const groundingBlock = buildGroundingBlock(webSnippets)
  const virmpBlock = buildVirmpGroundingBlock(input.specialty, input.keywords)
  const combinedGrounding = [groundingBlock, virmpBlock].filter(Boolean).join('\n\n')

  // ── Stage 2: run LLM providers in parallel, with web grounding ──
  const llmPromises: Promise<{ provider: 'openai' | 'gemini'; raw: string } | null>[] = []

  if (hasOpenAI) {
    llmPromises.push(
      (async () => {
        try {
          const result = await agentChat({
            agentId: 'dvm-candidate-scout',
            runId: `dvm-scout-${Date.now()}`,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `${userPrompt}\n\n${combinedGrounding}` },
            ],
            model: 'reasoning',
            maxTokens: 4000,
            temperature: 0.4,
            responseFormat: 'json',
          })
          return { provider: 'openai' as const, raw: result.content }
        } catch (err) {
          logger.error('OpenAI DVM scout failed', err as Error, 'find-dvm-candidates')
          providerErrors.push(`openai: ${(err as Error).message}`)
          return null
        }
      })(),
    )
  }

  if (hasGemini) {
    llmPromises.push(
      (async () => {
        try {
          const raw = await geminiGenerate(
            `${systemPrompt}\n\n${userPrompt}\n\n${combinedGrounding}\n\nReturn ONLY valid JSON in the exact schema requested.`,
            { temperature: 0.4, maxTokens: 4000 },
          )
          return { provider: 'gemini' as const, raw }
        } catch (err) {
          logger.error('Gemini DVM scout failed', err as Error, 'find-dvm-candidates')
          providerErrors.push(`gemini: ${(err as Error).message}`)
          return null
        }
      })(),
    )
  }

  const settled = await Promise.all(llmPromises)
  const allProspects: DvmProspect[] = [
    ...apolloRes,
    ...npiRes,
    ...tavilyRes.prospects,
    ...googleRes.prospects,
    ...directoryRes,
    ...acvsRes,
  ]

  for (const r of settled) {
    if (!r) continue
    const parsed = parseProspects(r.raw, r.provider)
    allProspects.push(...parsed)
  }

  // Deduplicate by name + employer + city
  const merged = mergeProspects(allProspects)

  // Specialty-aware scoring: every prospect gets a `specialty_match`
  // score (0-100) describing how well its credentials/specialty/source
  // align with the requested specialty. We sort primarily by this score,
  // then by the provider-supplied match_score as a tiebreaker. This is
  // why searching for "Surgeon" now puts DACVS specialists first.
  for (const p of merged) {
    p.specialty_match = computeSpecialtyMatch(p, input)
  }
  let sorted = merged
    .sort((a, b) => {
      const sm = (b.specialty_match ?? 0) - (a.specialty_match ?? 0)
      if (sm !== 0) return sm
      return (b.match_score ?? 0) - (a.match_score ?? 0)
    })
    .slice(0, input.maxResults)

  // ── Contact enrichment: unlock email/phone via Apollo people/match ──
  if (hasApollo) {
    await enrichContactsViaApollo(sorted).catch(err => {
      providerErrors.push(`apollo_enrich: ${(err as Error).message}`)
      logger.error('Apollo contact enrichment failed', err as Error, 'find-dvm-candidates')
    })
  }

  // ── LinkedIn enrichment: scrape public profile via Tavily extract to fill
  //    in credentials (DVM / DACVS / etc.) and any visible email. ──
  if (hasTavily) {
    await enrichFromLinkedIn(sorted).catch(err => {
      providerErrors.push(`linkedin_enrich: ${(err as Error).message}`)
      logger.error('LinkedIn enrichment failed', err as Error, 'find-dvm-candidates')
    })
  }

  // ── Optional: enforce radius via OSM Nominatim ──
  let droppedOutsideRadius = 0
  if (input.enforceRadius) {
    const center = await nominatimGeocode(input.location).catch(() => null)
    if (center) {
      const filtered: DvmProspect[] = []
      for (const p of sorted) {
        const addr = [p.current_employer, p.city, p.state].filter(Boolean).join(', ')
        if (!addr) {
          filtered.push(p) // can't verify, keep
          continue
        }
        const loc = await nominatimGeocode(addr).catch(() => null)
        if (!loc) {
          filtered.push(p)
          continue
        }
        const d = distanceMiles(center.lat, center.lng, loc.lat, loc.lng)
        p.distance_miles = Math.round(d * 10) / 10
        if (d <= input.radiusMiles) {
          filtered.push(p)
        } else {
          droppedOutsideRadius++
        }
      }
      sorted = filtered
    } else {
      logger.warn(`Nominatim could not geocode search center "${input.location}"`, 'find-dvm-candidates')
    }
  }

  // ── Optional: free public-source verification (NPI + state board + AVMA) ──
  if (input.verify) {
    await Promise.all(sorted.map(async (p) => {
      try {
        const npi = await verifyDvmInNpi({
          firstName: p.first_name,
          lastName: p.last_name,
          state: p.state ?? undefined,
        })
        const stateUrl = p.state ? buildStateBoardSearchUrl(p.state, p.first_name, p.last_name) : null
        const diplomate = p.credentials ? getDiplomateDirectoryByCredential(p.credentials) : null
        const diplomateUrl = diplomate?.buildSearchUrl
          ? diplomate.buildSearchUrl(p.last_name)
          : diplomate?.directoryUrl ?? null
        const schoolMatch = p.vet_school ? isAvmaAccreditedSchool(p.vet_school) : null

        let confidence = 0
        const reasons: string[] = []
        if (npi.matched) {
          confidence += npi.isVeterinary ? 25 : 10
          reasons.push(npi.isVeterinary
            ? `NPI vet match (${npi.npiNumber})`
            : `NPI match (${npi.npiNumber}); non-vet taxonomy`)
        }
        if (schoolMatch === true) { confidence += 15; reasons.push('AVMA-accredited school') }
        else if (schoolMatch === false) reasons.push('Vet school not in AVMA list')
        if (stateUrl) reasons.push(`State board lookup available (${p.state})`)
        if (diplomate) reasons.push(`Verify ${diplomate.diplomateCredential} via ${diplomate.abbreviation}`)

        p.verification = {
          confidence: Math.min(confidence, 100),
          reasons,
          npi_matched: npi.matched,
          npi_number: npi.npiNumber ?? null,
          npi_is_veterinary: npi.isVeterinary,
          state_board_url: stateUrl,
          diplomate_directory_url: diplomateUrl,
          avma_school_match: schoolMatch,
        }
      } catch (err) {
        logger.warn(`Verification failed for ${p.first_name} ${p.last_name}: ${(err as Error).message}`, 'find-dvm-candidates')
        p.verification = null
      }
    }))
  }

  // A provider is "active" only if it was configured AND did not error.
  const erroredProviders = new Set(
    providerErrors.map(e => e.split(':')[0]?.trim()).filter(Boolean) as string[],
  )
  const okOpenAI = hasOpenAI && !erroredProviders.has('openai') && settled.some(r => r?.provider === 'openai')
  const okGemini = hasGemini && !erroredProviders.has('gemini') && settled.some(r => r?.provider === 'gemini')
  const okApollo = hasApollo && !erroredProviders.has('apollo')
  const okTavily = hasTavily && !erroredProviders.has('tavily')
  const okGoogleCse = hasGoogleCse && !erroredProviders.has('google_cse')

  return {
    success: true,
    count: sorted.length,
    prospects: sorted,
    providers: {
      openai: okOpenAI,
      gemini: okGemini,
      apollo: okApollo,
      npi: hasNpi,
      tavily: okTavily,
      google_cse: okGoogleCse,
      acvs: !erroredProviders.has('acvs'),
    },
    warnings: buildWarnings({ hasOpenAI, hasGemini, hasApollo, hasTavily, hasGoogleCse }, providerErrors, droppedOutsideRadius),
    criteria: input,
  }
})

function buildSystemPrompt(input: Required<SearchInput>): string {
  return `You are a veterinary recruiting researcher for Green Dog Animal Hospital, a multi-location veterinary practice.

Your job is to identify real, currently-practicing or actively job-seeking Doctors of Veterinary Medicine (DVM/VMD) and veterinary specialists that match the search criteria.

Authoritative public sources you should consult (and you are not limited to these):

ACTIVE JOB-BOARD SOURCES (prioritize these — these surface candidates actively job-seeking):
- AVMA Veterinary Career Center (jobs.avma.org)
- AAHA Career Center (careers.aaha.org)
- VetCandy (vetcandy.com/jobs)
- VetMedTeam Career Center
- ACVS Career Center (jobs.acvs.org)
- ACVIM Career Center (jobs.acvim.org)
- VECCS Career Center (veccs.org/jobs)
- iHireVeterinary (ihireveterinary.com)
- Indeed, ZipRecruiter, LinkedIn Jobs, Glassdoor — DVM postings
- Practice-owner forums: VIN job board, Reddit r/Veterinary, DVM360 careers
- Mars/VCA, BluePearl, Banfield, Pathway, Thrive, Ethos talent pages (if candidate listed publicly as recently departed)

DIRECTORY / PASSIVE SOURCES (use for enrichment + sourcing):
- AVMA member/practitioner directory (avma.org)
- ACVS, ACVIM, ACVO, ACVD, ACVECC, ACVAA specialist diplomate directories
- State veterinary medical board licensee lookups (California VMB, Texas BVME, etc.)
- Veterinary hospital "Our Team" / "Meet the Doctors" pages within the search radius
- University vet school faculty/resident pages (UC Davis, Cornell, Penn, OSU, Tufts, Colorado State, etc.)
- VIN (Veterinary Information Network) public profiles
- Public LinkedIn profiles indexed by web search
- Conference speaker rosters (WVC, VMX, Fetch, ACVIM Forum, ACVS Surgery Summit)

CRITICAL RULES:
1. Only return real people you can cite with a public source URL. Do NOT fabricate names.
2. Every prospect MUST include source_url (the page where you found them) and source_name.
3. If you cannot find an email or phone, set them to null. Do NOT guess or infer email patterns.
4. Mark match_score 0-100 based on how well the prospect matches the criteria.
5. Prefer prospects within ${input.radiusMiles} miles of "${input.location}".
6. ${input.activeOnly ? 'ACTIVE-SEARCH MODE: Return ONLY candidates who are demonstrably looking for a position right now (job-board postings, "open to work" status, recent CV uploads, recent resignation announcements). Set actively_seeking=true on every result.' : 'Mark actively_seeking=true ONLY when you find evidence the candidate is currently looking (job board posting, open-to-work, recent resignation). Otherwise actively_seeking=false.'}
7. Whenever discoverable, include vet_school (e.g. "UC Davis SVM"), graduation_year, and residency program.
8. Output JSON ONLY, no prose, no markdown fences.`
}

function buildUserPrompt(input: Required<SearchInput>): string {
  return `Find up to ${input.maxResults} prospective DVM candidates with these criteria:
- Specialty / role: ${input.specialty}
- Geography: within ${input.radiusMiles} miles of ${input.location}
- Minimum experience: ${input.experienceMin} years
- Include board-certified specialists: ${input.includeSpecialists}
- Include new graduates: ${input.includeNewGraduates}
- Active-search mode (job-board postings only): ${input.activeOnly}
${input.keywords.length ? `- Additional keywords: ${input.keywords.join(', ')}\n` : ''}
Return JSON in this exact shape:
{
  "prospects": [
    {
      "first_name": "string",
      "last_name": "string",
      "credentials": "DVM | VMD | DVM, DACVS | etc.",
      "specialty": "string or null",
      "current_employer": "string or null",
      "city": "string or null",
      "state": "two-letter code or null",
      "email": "string or null",
      "phone": "string or null",
      "linkedin_url": "string or null",
      "website_url": "string or null",
      "source_name": "string",
      "source_url": "string",
      "experience_years": number or null,
      "vet_school": "string or null (e.g. UC Davis SVM, Cornell CVM)",
      "graduation_year": number or null,
      "residency": "string or null",
      "actively_seeking": boolean,
      "notes": "1-2 sentence summary of fit and notable qualifications",
      "match_score": 0-100
    }
  ]
}`
}

function parseProspects(raw: string, provider: 'openai' | 'gemini'): DvmProspect[] {
  if (!raw) return []
  let jsonText = raw.trim()
  // Strip code fences if Gemini wraps output
  jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    const parsed = JSON.parse(jsonText)
    const list = Array.isArray(parsed) ? parsed : parsed.prospects
    if (!Array.isArray(list)) return []
    return list
      .filter((p: any) => p && p.first_name && p.last_name)
      .map((p: any) => ({
        first_name: String(p.first_name).trim(),
        last_name: String(p.last_name).trim(),
        credentials: p.credentials ?? null,
        specialty: p.specialty ?? null,
        current_employer: p.current_employer ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        linkedin_url: p.linkedin_url ?? null,
        website_url: p.website_url ?? null,
        source_name: p.source_name ?? provider,
        source_url: p.source_url ?? '',
        experience_years: typeof p.experience_years === 'number' ? p.experience_years : null,
        vet_school: p.vet_school ?? null,
        graduation_year: typeof p.graduation_year === 'number' ? p.graduation_year : null,
        residency: p.residency ?? null,
        actively_seeking: !!p.actively_seeking,
        notes: p.notes ?? null,
        match_score: typeof p.match_score === 'number' ? p.match_score : 50,
        provider,
      }))
  } catch (err) {
    logger.warn(`Failed to parse ${provider} JSON`, 'find-dvm-candidates', { error: (err as Error).message })
    return []
  }
}

function mergeProspects(list: DvmProspect[]): DvmProspect[] {
  const map = new Map<string, DvmProspect>()
  for (const p of list) {
    const key = `${p.first_name.toLowerCase()}|${p.last_name.toLowerCase()}|${(p.current_employer ?? '').toLowerCase()}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, p)
    } else {
      // Merge: prefer non-null values, average match_score, mark provider as merged
      map.set(key, {
        ...existing,
        credentials: existing.credentials ?? p.credentials,
        specialty: existing.specialty ?? p.specialty,
        current_employer: existing.current_employer ?? p.current_employer,
        city: existing.city ?? p.city,
        state: existing.state ?? p.state,
        email: existing.email ?? p.email,
        phone: existing.phone ?? p.phone,
        linkedin_url: existing.linkedin_url ?? p.linkedin_url,
        website_url: existing.website_url ?? p.website_url,
        experience_years: existing.experience_years ?? p.experience_years,
        vet_school: existing.vet_school ?? p.vet_school,
        graduation_year: existing.graduation_year ?? p.graduation_year,
        residency: existing.residency ?? p.residency,
        actively_seeking: existing.actively_seeking || p.actively_seeking,
        notes: existing.notes && p.notes ? `${existing.notes} | ${p.notes}` : existing.notes ?? p.notes,
        match_score: Math.round(((existing.match_score ?? 50) + (p.match_score ?? 50)) / 2),
        provider: 'merged',
      })
    }
  }
  return Array.from(map.values())
}

function summarizeProviderError(raw: string): string {
  // Format: "<provider>: <message>"
  const colon = raw.indexOf(':')
  const provider = colon > 0 ? raw.slice(0, colon) : 'unknown'
  const msg = colon > 0 ? raw.slice(colon + 1).trim() : raw

  const labels: Record<string, string> = {
    apollo: 'Apollo.io',
    openai: 'OpenAI',
    gemini: 'Gemini',
    tavily: 'Tavily',
    google_cse: 'Google CSE',
    npi: 'NPI Registry',
    acvs: 'ACVS Directory',
  }
  const label = labels[provider] || provider

  if (/\b403\b|forbidden/i.test(msg)) {
    if (provider === 'apollo') return `${label}: People Search not enabled on this Apollo plan (403). Upgrade to a plan with API access to enable Apollo results.`
    return `${label}: access denied (403). Verify the API key has the required permissions.`
  }
  if (/\b401\b|unauthorized/i.test(msg)) {
    return `${label}: invalid or missing API key (401).`
  }
  if (/\b404\b|not found/i.test(msg)) {
    if (provider === 'gemini') return `${label}: model not found (404). Update GEMINI_MODEL — try "gemini-2.0-flash" or "gemini-2.5-flash".`
    return `${label}: endpoint not found (404).`
  }
  if (/\b429\b|quota|rate limit|insufficient_quota/i.test(msg)) {
    if (provider === 'openai') return `${label}: quota exceeded (429). Check billing at platform.openai.com.`
    return `${label}: rate limit / quota exceeded (429).`
  }
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return `${label}: network timeout — try again.`
  }
  // Default: short message only
  return `${label}: ${msg.slice(0, 160)}`
}

function buildWarnings(
  flags: { hasOpenAI: boolean; hasGemini: boolean; hasApollo: boolean; hasTavily: boolean; hasGoogleCse: boolean },
  providerErrors: string[],
  droppedOutsideRadius = 0,
): string[] {
  const warnings: string[] = []
  if (!flags.hasApollo) warnings.push('APOLLO_API_KEY not set — Apollo people search skipped.')
  if (!flags.hasOpenAI) warnings.push('OPENAI_API_KEY not set — OpenAI provider skipped.')
  if (!flags.hasGemini) warnings.push('GEMINI_API_KEY not set — Gemini provider skipped.')
  if (!flags.hasTavily) warnings.push('TAVILY_API_KEY not set — Tavily web search skipped.')
  if (!flags.hasGoogleCse) warnings.push('GOOGLE_CSE_API_KEY/GOOGLE_CSE_ID not set — Google Custom Search skipped.')
  for (const e of providerErrors) warnings.push(summarizeProviderError(e))
  if (droppedOutsideRadius > 0) warnings.push(`${droppedOutsideRadius} prospect(s) dropped after OSM-based radius enforcement.`)
  return warnings
}

// ─────────────────────────────────────────────────────────────────────────────
// Apollo.io: structured DVM search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a free-form specialty input (from the UI) to a list of Apollo person_titles
 * that should match it. We over-include synonyms because Apollo title matching
 * is a partial/contains-style match, not an enum.
 */
function specialtyToApolloTitles(specialty: string): string[] {
  const s = specialty.trim().toLowerCase()
  const base = ['veterinarian', 'doctor of veterinary medicine', 'DVM', 'VMD']
  if (!s || s === 'general practice' || s === 'general practitioner' || s === 'gp') {
    return [...base, 'associate veterinarian', 'general practitioner']
  }
  if (s.includes('surgery') || s.includes('surgeon')) {
    return ['veterinary surgeon', 'small animal surgeon', 'surgical resident', 'DACVS', ...base]
  }
  if (s.includes('internal medicine') || s.includes('internist')) {
    return ['veterinary internist', 'internal medicine specialist', 'DACVIM', ...base]
  }
  if (s.includes('emergency') || s.includes('criticalist') || s.includes('ecc')) {
    return ['emergency veterinarian', 'criticalist', 'DACVECC', 'ER veterinarian', ...base]
  }
  if (s.includes('dent')) {
    return ['veterinary dentist', 'DAVDC', ...base]
  }
  if (s.includes('cardio')) {
    return ['veterinary cardiologist', 'DACVIM cardiology', ...base]
  }
  if (s.includes('derm')) {
    return ['veterinary dermatologist', 'DACVD', ...base]
  }
  if (s.includes('onco')) {
    return ['veterinary oncologist', 'DACVIM oncology', ...base]
  }
  if (s.includes('ophthal')) {
    return ['veterinary ophthalmologist', 'DACVO', ...base]
  }
  if (s.includes('neuro')) {
    return ['veterinary neurologist', 'DACVIM neurology', ...base]
  }
  if (s.includes('radio')) {
    return ['veterinary radiologist', 'DACVR', ...base]
  }
  if (s.includes('anesth')) {
    return ['veterinary anesthesiologist', 'DACVAA', ...base]
  }
  if (s.includes('exotic') || s.includes('avian')) {
    return ['exotic animal veterinarian', 'avian veterinarian', ...base]
  }
  // Fall back: include the specialty itself plus base titles
  return [specialty, ...base]
}

function locationToApolloLocations(location: string): string[] {
  const l = location.trim()
  if (!l) return []
  // Apollo accepts free-form "City, State, Country" strings. We pass the user
  // input plus a US-suffixed variant if it looks like a US state/city.
  const variants = new Set<string>([l])
  if (!/united states|usa|us\b/i.test(l)) variants.add(`${l}, US`)
  return Array.from(variants)
}

function apolloPersonToProspect(p: ApolloPerson): DvmProspect | null {
  const first = (p.first_name || '').trim()
  const last = (p.last_name || '').trim()
  if (!first || !last) return null

  const title = (p.title || '').trim()
  const credentialsMatch = title.match(/\b(DVM|VMD|DACVS|DACVIM|DACVO|DACVD|DACVECC|DACVAA|DAVDC|DACVR)\b/i)
  const credentials = credentialsMatch ? credentialsMatch[1].toUpperCase() : null

  const org = p.organization || {}
  const linkedin = p.linkedin_url || null
  const website = (org as any).website_url || null

  return {
    first_name: first,
    last_name: last,
    credentials,
    specialty: title || null,
    current_employer: org.name || null,
    city: p.city || null,
    state: p.state || null,
    email: isMaskedEmail(p.email) ? null : (p.email || null),
    phone: null,
    linkedin_url: linkedin,
    website_url: website,
    source_name: 'Apollo.io',
    source_url: linkedin || website || 'https://app.apollo.io',
    experience_years: null,
    vet_school: null,
    graduation_year: null,
    residency: null,
    actively_seeking: false,
    notes: org.industry ? `${org.industry}${org.estimated_num_employees ? ` · ~${org.estimated_num_employees} employees` : ''}` : null,
    match_score: 70,
    provider: 'apollo',
  }
}

async function searchApolloDvms(input: Required<SearchInput>): Promise<DvmProspect[]> {
  const titles = specialtyToApolloTitles(input.specialty)
  const locations = locationToApolloLocations(input.location)

  const opts: Parameters<typeof apolloPeopleSearch>[0] = {
    person_titles: titles,
    per_page: Math.min(Math.max(input.maxResults, 10), 100),
    page: 1,
  }
  if (locations.length) opts.person_locations = locations
  if (input.keywords.length) opts.q_keywords = input.keywords.join(' ')

  const res = await apolloPeopleSearch(opts)
  const list = (res.people || res.contacts || []) as ApolloPerson[]
  return list
    .map(apolloPersonToProspect)
    .filter((x): x is DvmProspect => x !== null)
}

// ─────────────────────────────────────────────────────────────────────────────
// Web grounding (snippets shared with the LLM providers for citations)
// ─────────────────────────────────────────────────────────────────────────────

interface WebSnippet {
  title: string
  url: string
  snippet: string
  source: 'tavily' | 'google_cse'
}

function buildGroundingBlock(snippets: WebSnippet[]): string {
  if (!snippets.length) return ''
  const lines = snippets
    .slice(0, 30)
    .map((s, i) => `[${i + 1}] (${s.source}) ${s.title}\n  URL: ${s.url}\n  ${s.snippet.slice(0, 280)}`)
    .join('\n\n')
  return `WEB GROUNDING — real, freshly-retrieved sources you may cite for prospects.\nUse these URLs as source_url when extracting candidate names from these pages.\n\n${lines}`
}

/**
 * Veterinary specialty diplomate directories.
 *
 * Each entry maps a specialty keyword (matched against the user's
 * specialty/keywords input) to the public "find a specialist" pages
 * maintained by the relevant American Veterinary Specialty College.
 * These pages list every board-certified diplomate in the US.
 *
 * We use these to:
 *   1. Add `site:<domain>` queries to Tavily / Google CSE so the
 *      LLMs and snippet parser surface real specialists from these
 *      directories.
 *   2. Try a direct HTTP fetch of the directory page and parse names
 *      out of the HTML (lightweight, no headless browser).
 */
interface SpecialtyDirectory {
  /** Specialty terms that should activate this directory (lowercase, partial match). */
  match: string[]
  college: string
  abbreviation: string
  credential: string
  /** Public "find a specialist" URLs (often multiple — directory + search form). */
  urls: string[]
  /** Domains to feed into siteSearch / Tavily include_domains. */
  domains: string[]
}

const SPECIALTY_DIRECTORIES: SpecialtyDirectory[] = [
  {
    match: ['surgery', 'surgeon'],
    college: 'American College of Veterinary Surgeons',
    abbreviation: 'ACVS',
    credential: 'DACVS',
    urls: [
      'https://www.acvs.org/find-surgeon/',
      'https://online.acvs.org/acvsssa/rflssareferral.query_page?P_VENDOR_TY=VETS',
    ],
    domains: ['acvs.org', 'online.acvs.org'],
  },
  {
    match: [
      'internal medicine', 'internist',
      'cardiology', 'cardiologist',
      'oncology', 'oncologist',
      'neurology', 'neurologist',
      'nutrition', 'nutritionist',
      'large animal internal medicine',
      'small animal internal medicine',
      'sa-im', 'la-im',
    ],
    college: 'American College of Veterinary Internal Medicine',
    abbreviation: 'ACVIM',
    credential: 'DACVIM',
    urls: ['https://find.acvim.org/', 'https://www.acvim.org/'],
    domains: ['acvim.org', 'find.acvim.org'],
  },
  {
    match: ['ophthalmology', 'ophthalmologist', 'eye'],
    college: 'American College of Veterinary Ophthalmologists',
    abbreviation: 'ACVO',
    credential: 'DACVO',
    urls: ['https://www.acvo.org/find-a-veterinary-ophthalmologist'],
    domains: ['acvo.org'],
  },
  {
    match: ['dermatology', 'dermatologist', 'derm', 'skin'],
    college: 'American College of Veterinary Dermatology',
    abbreviation: 'ACVD',
    credential: 'DACVD',
    urls: ['https://www.acvd.org/page/diplomatedirectory'],
    domains: ['acvd.org'],
  },
  {
    match: ['emergency', 'criticalist', 'critical care', 'ecc', 'urgent care'],
    college: 'American College of Veterinary Emergency & Critical Care',
    abbreviation: 'ACVECC',
    credential: 'DACVECC',
    urls: ['https://acvecc.org/find-a-criticalist/'],
    domains: ['acvecc.org'],
  },
  {
    match: ['anesthesia', 'anesthesiology', 'anesthesiologist'],
    college: 'American College of Veterinary Anesthesia and Analgesia',
    abbreviation: 'ACVAA',
    credential: 'DACVAA',
    urls: ['https://acvaa.org/find-a-diplomate/'],
    domains: ['acvaa.org'],
  },
  {
    match: ['dentistry', 'dental', 'dentist'],
    college: 'American Veterinary Dental College',
    abbreviation: 'AVDC',
    credential: 'DAVDC',
    urls: ['https://avdc.org/find-a-veterinary-dentist/'],
    domains: ['avdc.org'],
  },
  {
    match: ['behavior', 'behaviorist'],
    college: 'American College of Veterinary Behaviorists',
    abbreviation: 'ACVB',
    credential: 'DACVB',
    urls: ['https://www.dacvb.org/search/custom.asp?id=4709'],
    domains: ['dacvb.org', 'acvb.org'],
  },
  {
    match: ['radiology', 'radiologist', 'imaging', 'ultrasound', 'mri'],
    college: 'American College of Veterinary Radiology',
    abbreviation: 'ACVR',
    credential: 'DACVR',
    urls: ['https://acvr.org/page/diplomate-directory'],
    domains: ['acvr.org'],
  },
  {
    match: ['pathology', 'pathologist'],
    college: 'American College of Veterinary Pathologists',
    abbreviation: 'ACVP',
    credential: 'DACVP',
    urls: ['https://www.acvp.org/page/Members'],
    domains: ['acvp.org'],
  },
  {
    match: ['theriogenology', 'reproduction', 'reproductive'],
    college: 'American College of Theriogenologists',
    abbreviation: 'ACT',
    credential: 'DACT',
    urls: ['https://theriogenology.org/page/DiplomateDirectory'],
    domains: ['theriogenology.org'],
  },
  {
    match: ['nutrition', 'nutritionist'],
    college: 'American College of Veterinary Nutrition',
    abbreviation: 'ACVN',
    credential: 'DACVN',
    urls: ['https://www.acvn.org/directory/'],
    domains: ['acvn.org'],
  },
  {
    match: ['preventive medicine', 'public health', 'epidemiology'],
    college: 'American College of Veterinary Preventive Medicine',
    abbreviation: 'ACVPM',
    credential: 'DACVPM',
    urls: ['https://acvpm.org/Diplomate-Directory'],
    domains: ['acvpm.org'],
  },
  {
    match: ['sports medicine', 'rehabilitation', 'rehab', 'physical therapy'],
    college: 'American College of Veterinary Sports Medicine and Rehabilitation',
    abbreviation: 'ACVSMR',
    credential: 'DACVSMR',
    urls: ['https://vsmr.org/find-a-specialist/'],
    domains: ['vsmr.org'],
  },
  {
    match: ['zoo', 'zoological', 'wildlife', 'exotic', 'avian', 'reptile', 'amphibian', 'fish'],
    college: 'American College of Zoological Medicine',
    abbreviation: 'ACZM',
    credential: 'DACZM',
    urls: ['https://www.aczm.org/diplomates'],
    domains: ['aczm.org'],
  },
  {
    match: [
      // ABVP species & practice categories
      'abvp', 'general practice', 'general practitioner', 'gp',
      'canine', 'feline', 'canine and feline', 'cat practice', 'dog practice',
      'avian practice', 'beef cattle', 'dairy', 'equine', 'food animal',
      'exotic companion mammal', 'reptile and amphibian', 'shelter medicine',
      'swine', 'fish practice',
    ],
    college: 'American Board of Veterinary Practitioners',
    abbreviation: 'ABVP',
    credential: 'DABVP',
    urls: ['https://abvp.com/find-a-diplomate/', 'https://abvp.com/'],
    domains: ['abvp.com'],
  },
  {
    match: ['animal welfare', 'welfare'],
    college: 'American College of Animal Welfare',
    abbreviation: 'ACAW',
    credential: 'DACAW',
    urls: ['https://www.acaw.org/diplomates', 'https://www.acaw.org/'],
    domains: ['acaw.org'],
  },
  {
    match: ['laboratory animal', 'lab animal', 'research animal'],
    college: 'American College of Laboratory Animal Medicine',
    abbreviation: 'ACLAM',
    credential: 'DACLAM',
    urls: ['https://www.aclam.org/find-a-diplomate', 'https://www.aclam.org/'],
    domains: ['aclam.org'],
  },
  {
    match: ['clinical pharmacology', 'pharmacology', 'pharmacologist'],
    college: 'American College of Veterinary Clinical Pharmacology',
    abbreviation: 'ACVCP',
    credential: 'DACVCP',
    urls: ['https://www.acvcp.org/diplomates', 'https://www.acvcp.org/'],
    domains: ['acvcp.org'],
  },
  {
    match: ['microbiology', 'microbiologist'],
    college: 'American College of Veterinary Microbiologists',
    abbreviation: 'ACVM',
    credential: 'DACVM',
    urls: ['https://www.acvm.us/diplomates'],
    domains: ['acvm.us'],
  },
  {
    match: ['toxicology', 'toxicologist'],
    college: 'American Board of Veterinary Toxicology',
    abbreviation: 'ABVT',
    credential: 'DABVT',
    urls: ['https://www.abvt.org/diplomates/'],
    domains: ['abvt.org'],
  },
  {
    match: ['poultry', 'avian medicine'],
    college: 'American College of Poultry Veterinarians',
    abbreviation: 'ACPV',
    credential: 'DACPV',
    urls: ['https://acpv.info/Find-a-Diplomate'],
    domains: ['acpv.info'],
  },
]

function findSpecialtyDirectories(input: Required<SearchInput>): SpecialtyDirectory[] {
  const haystack = [input.specialty, ...input.keywords].join(' ').toLowerCase()
  if (!haystack.trim()) return []
  return SPECIALTY_DIRECTORIES.filter(d => d.match.some(m => haystack.includes(m)))
}

function buildSearchQueries(input: Required<SearchInput>): string[] {
  const role = input.specialty || 'veterinarian'
  const loc = input.location || ''
  const queries = [
    `${role} DVM "${loc}" site:linkedin.com/in`,
    `${role} veterinarian ${loc} hospital staff`,
    `${role} veterinarian ${loc} "Meet the Doctors"`,
    // Job boards
    `DVM ${loc} site:jobs.avma.org OR site:careers.aaha.org OR site:jobs.acvs.org OR site:jobs.acvim.org`,
    `${role} ${loc} site:vetcandy.com OR site:ihireveterinary.com OR site:veccs.org`,
    `${role} ${loc} site:indeed.com OR site:ziprecruiter.com OR site:linkedin.com/jobs`,
    // Governing / oversight bodies (AVMA, AAVSB, ABVS, VIRMP)
    `${role} ${loc} site:avma.org`,
    `veterinary specialty ${role} site:avma.org/education/veterinary-specialties`,
    `licensed veterinarian ${loc} site:aavsb.org`,
    `${role} resident OR intern ${loc} site:virmp.org`,
  ]

  // Add a dedicated query per matching specialty directory.
  const dirs = findSpecialtyDirectories(input)
  for (const d of dirs) {
    const sites = d.domains.map(dom => `site:${dom}`).join(' OR ')
    queries.push(`${role} ${loc} ${sites}`)
    queries.push(`${d.credential} diplomate ${loc} ${sites}`)
  }

  if (input.activeOnly) {
    queries.push(`"open to work" OR "actively seeking" DVM ${loc}`)
    queries.push(`veterinarian ${loc} site:ihireveterinary.com OR site:vetcandy.com OR site:jobs.avma.org`)
  }
  return queries.slice(0, 20)
}

// Common page-title noise that the snippet→prospect extractor must reject
// so we don't end up with "John Search" / "Find Surgeon" style false hits.
const SNIPPET_NOISE_RE = /\b(search|find|results?|directory|diplomate|surgeon|specialist|home|page|welcome|login|privacy|terms|contact|about|menu|college|hospital|clinic|service|sitemap|index)\b/i

/** Detect a US state abbreviation or full state name in free text. */
function extractStateFromText(text: string): { state: string | null; city: string | null } {
  if (!text) return { state: null, city: null }
  // "City, ST 12345" or "City, ST"
  const m = text.match(/([A-Z][A-Za-z .'\-]+?),\s*([A-Z]{2})(?:\s+\d{5})?\b/)
  if (m) return { city: m[1]!.trim(), state: m[2]! }
  for (const [name, abbr] of Object.entries(US_STATE_ABBR)) {
    if (text.toLowerCase().includes(name)) return { city: null, state: abbr }
  }
  return { state: null, city: null }
}

function snippetToProspect(s: WebSnippet, provider: 'tavily' | 'google_cse'): DvmProspect | null {
  const title = (s.title || '').replace(/\s+/g, ' ').trim()
  // Strip site-name suffixes / publisher tails.
  const cleaned = title
    .replace(/\s*[-|–—].*$/, '')
    .replace(/^Dr\.?\s+/i, '')
    .replace(/^Profile of\s+/i, '')
    .replace(/^Meet\s+/i, '')
    .trim()
  if (!cleaned) return null

  const credMatches = cleaned.match(/\b(DVM|VMD|DABVP|DABVT|DACAW|DACLAM|DACPV|DACT|DACVAA|DACVB|DACVCP|DACVD|DACVECC|DACVIM|DACVM|DACVN|DACVO|DACVP|DACVPM|DACVR|DACVS|DACVSMR|DACZM|DAVDC|MS|PhD)\b/gi)
  const credentials = credMatches
    ? Array.from(new Set(credMatches.map(c => c.toUpperCase()))).slice(0, 4).join(', ')
    : null
  const stripped = cleaned
    .replace(/,?\s*\b(DVM|VMD|DABVP|DABVT|DACAW|DACLAM|DACPV|DACT|DACVAA|DACVB|DACVCP|DACVD|DACVECC|DACVIM|DACVM|DACVN|DACVO|DACVP|DACVPM|DACVR|DACVS|DACVSMR|DACZM|DAVDC|MS|PhD)\b/gi, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop parentheticals like "(SA)"
    .replace(/\s{2,}/g, ' ')
    .trim()

  const parts = stripped.split(/\s+/).filter(p => /^[A-Z][a-zA-Z'’\-]+\.?$/.test(p))
  if (parts.length < 2) return null

  // Reject obvious page-title noise where the "name" is actually a keyword.
  if (SNIPPET_NOISE_RE.test(parts[0]!) || SNIPPET_NOISE_RE.test(parts[parts.length - 1]!)) {
    return null
  }
  // Names should not be ALL CAPS chunks (often nav-bar labels).
  const first = parts[0]!.replace(/\.$/, '')
  const last = parts[parts.length - 1]!.replace(/\.$/, '')
  if (first.length < 2 || last.length < 2) return null

  const haystack = `${title} ${s.snippet || ''}`
  const { city, state } = extractStateFromText(haystack)
  // Try to harvest an email or phone if it's already in the snippet.
  const emailMatch = haystack.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  const phoneMatch = haystack.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)

  // Stronger source labelling so users know which engine surfaced the hit.
  const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, '') } catch { return '' } })()
  const sourceName = host
    ? `${provider === 'tavily' ? 'Tavily' : 'Google CSE'} · ${host}`
    : (provider === 'tavily' ? 'Tavily web search' : 'Google Custom Search')

  return {
    first_name: first,
    last_name: last,
    credentials,
    specialty: null,
    current_employer: null,
    city,
    state,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    linkedin_url: /linkedin\.com\/in\//i.test(s.url) ? s.url : null,
    website_url: s.url,
    source_name: sourceName,
    source_url: s.url,
    experience_years: null,
    vet_school: null,
    graduation_year: null,
    residency: null,
    actively_seeking: false,
    notes: s.snippet?.slice(0, 200) || null,
    match_score: 50,
    provider,
  }
}

async function searchTavilyDvms(
  input: Required<SearchInput>,
): Promise<{ prospects: DvmProspect[]; snippets: WebSnippet[] }> {
  const queries = buildSearchQueries(input)
  const results = await Promise.all(
    queries.map(q =>
      tavilySearch(q, { max_results: 5, search_depth: 'basic' }).catch(() => null),
    ),
  )
  const snippets: WebSnippet[] = []
  const seen = new Set<string>()
  for (const r of results) {
    for (const item of r?.results || []) {
      if (!item.url || seen.has(item.url)) continue
      seen.add(item.url)
      snippets.push({
        title: item.title || '',
        url: item.url,
        snippet: item.content || '',
        source: 'tavily',
      })
    }
  }
  const prospects = snippets
    .map(s => snippetToProspect(s, 'tavily'))
    .filter((p): p is DvmProspect => p !== null)
  return { prospects, snippets }
}

async function searchGoogleCseDvms(
  input: Required<SearchInput>,
): Promise<{ prospects: DvmProspect[]; snippets: WebSnippet[] }> {
  const queries = buildSearchQueries(input)
  const results = await Promise.all(
    queries.map(q => googleSearch(q, { num: 8 }).catch(() => null)),
  )
  const snippets: WebSnippet[] = []
  const seen = new Set<string>()
  for (const r of results) {
    for (const item of r?.items || []) {
      if (!item.link || seen.has(item.link)) continue
      seen.add(item.link)
      snippets.push({
        title: item.title || '',
        url: item.link,
        snippet: item.snippet || '',
        source: 'google_cse',
      })
    }
  }
  const prospects = snippets
    .map(s => snippetToProspect(s, 'google_cse'))
    .filter((p): p is DvmProspect => p !== null)
  return { prospects, snippets }
}

// ─────────────────────────────────────────────────────────────────────────────
// NPI Registry: structured DVM search (free, public, no key required)
// ─────────────────────────────────────────────────────────────────────────────

const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
}

function extractStateFromLocation(loc: string): string | undefined {
  const m = loc.match(/\b([A-Z]{2})\b/)
  if (m) return m[1]
  const lower = loc.toLowerCase()
  for (const [name, abbr] of Object.entries(US_STATE_ABBR)) {
    if (lower.includes(name)) return abbr
  }
  return undefined
}

function npiResultToProspect(r: NpiResult): DvmProspect | null {
  const basic: any = (r as any).basic || {}
  const first = basic.first_name?.trim()
  const last = basic.last_name?.trim()
  if (!first || !last) return null
  const addresses: any[] = (r as any).addresses || []
  const loc = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {}
  const taxonomies: any[] = (r as any).taxonomies || []
  const primaryTax = taxonomies.find(t => t.primary) || taxonomies[0]
  const credentials = basic.credential || null

  return {
    first_name: first,
    last_name: last,
    credentials,
    specialty: primaryTax?.desc || null,
    current_employer: null,
    city: loc.city || null,
    state: loc.state || null,
    email: null,
    phone: loc.telephone_number || null,
    linkedin_url: null,
    website_url: null,
    source_name: 'NPI Registry (CMS)',
    source_url: `https://npiregistry.cms.hhs.gov/provider-view/${(r as any).number}`,
    experience_years: null,
    vet_school: null,
    graduation_year: null,
    residency: null,
    actively_seeking: false,
    notes: primaryTax?.license ? `License: ${primaryTax.license}` : null,
    match_score: 60,
    provider: 'npi',
  }
}

async function searchNpiDvms(input: Required<SearchInput>): Promise<DvmProspect[]> {
  const state = extractStateFromLocation(input.location)
  if (!state) return []
  const results = await searchNpiProviders({
    state,
    taxonomyDescription: 'Veterinarian',
    enumerationType: 'NPI-1',
    limit: Math.min(Math.max(input.maxResults, 10), 50),
  })
  return results.map(npiResultToProspect).filter((p): p is DvmProspect => p !== null)
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct specialty-directory scraping
// ─────────────────────────────────────────────────────────────────────────────
//
// We attempt a lightweight GET on each matching specialty directory and
// extract names with a regex. This deliberately avoids a headless-browser
// dependency. Some directory pages render their listings via JavaScript
// and will yield zero hits — that's fine, the Tavily/Google CSE site:
// queries handle those.

function extractNamesFromHtml(html: string): Array<{ first: string; last: string; credentials?: string }> {
  if (!html) return []
  // Strip scripts/styles to reduce noise.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

  // "First Last, DVM, DACVS" — capture First, Last, optional credentials cluster
  const re = /\b([A-Z][a-z]{1,20})\s+([A-Z][a-z'’\-]{1,30})\s*,?\s*(DVM|VMD|DACVS|DACVIM|DACVO|DACVD|DACVECC|DACVAA|DAVDC|DACVR|DACVB|DACVP|DACT|DACVN|DACVPM|DACVSMR|DACZM|DACVM|DABVT|DACPV|MS|PhD)\b/g
  const out: Array<{ first: string; last: string; credentials?: string }> = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) !== null) {
    const first = m[1]!
    const last = m[2]!
    const cred = m[3]!.toUpperCase()
    const key = `${first.toLowerCase()}|${last.toLowerCase()}`
    if (seen.has(key)) continue
    // Filter out obvious non-names (Find Surgeon, About Us, etc.)
    if (/^(Find|About|Contact|Search|Home|Member|Login|Welcome|Skip|Click|View|Read|Learn|Privacy|Terms|All|Resources|Accessibility)$/i.test(first)) continue
    if (/^(Surgeon|Surgery|Specialist|Veterinarian|Diplomate|Directory|Member|Diplomates|Privacy|Policy|College|Hospital|Education)$/i.test(last)) continue
    seen.add(key)
    out.push({ first, last, credentials: cred })
    if (out.length >= 80) break
  }
  return out
}

async function fetchDirectoryHtml(url: string): Promise<string | null> {
  try {
    return await $fetch<string>(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GreenDogVetRecruiter/1.0; +https://www.employeegmgreendog.com)',
        accept: 'text/html,application/xhtml+xml',
      },
      timeout: 8000,
      // @ts-expect-error nitro $fetch supports `responseType` in runtime
      responseType: 'text',
    })
  } catch {
    return null
  }
}

async function searchSpecialtyDirectories(input: Required<SearchInput>): Promise<DvmProspect[]> {
  const dirs = findSpecialtyDirectories(input)
  if (!dirs.length) return []

  // Fetch every URL across all matching directories in parallel.
  const flatUrls: Array<{ dir: SpecialtyDirectory; url: string }> = []
  for (const d of dirs) {
    for (const u of d.urls) flatUrls.push({ dir: d, url: u })
  }

  const fetched = await Promise.all(flatUrls.map(async ({ dir, url }) => {
    const html = await fetchDirectoryHtml(url)
    if (!html) return [] as DvmProspect[]
    const names = extractNamesFromHtml(html)
    return names.map<DvmProspect>(n => ({
      first_name: n.first,
      last_name: n.last,
      credentials: n.credentials || dir.credential,
      specialty: dir.college,
      current_employer: null,
      city: null,
      state: null,
      email: null,
      phone: null,
      linkedin_url: null,
      website_url: url,
      source_name: `${dir.abbreviation} diplomate directory`,
      source_url: url,
      experience_years: null,
      vet_school: null,
      graduation_year: null,
      residency: null,
      actively_seeking: false,
      notes: null,
      match_score: 80,
      provider: 'google_cse', // grouped under web sources
    }))
  }))

  return fetched.flat()
}

// ─────────────────────────────────────────────────────────────────────────────
// Apollo people/match enrichment — unlock email + phone for each prospect.
// ─────────────────────────────────────────────────────────────────────────────
async function enrichContactsViaApollo(list: DvmProspect[]): Promise<void> {
  // Cap concurrency so we don't burn the Apollo quota in one shot.
  const tasks = list.map((p) => async () => {
    const needsEmail = isMaskedEmail(p.email)
    const needsPhone = !p.phone
    if (!needsEmail && !needsPhone) return
    if (!p.first_name || !p.last_name) return
    try {
      const opts: Parameters<typeof apolloPeopleEnrich>[0] = {
        first_name: p.first_name,
        last_name: p.last_name,
        reveal_personal_emails: needsEmail,
        reveal_phone_number: needsPhone,
      }
      if (p.linkedin_url) opts.linkedin_url = p.linkedin_url
      if (p.current_employer) opts.organization_name = p.current_employer
      const res = await apolloPeopleEnrich(opts)
      const person = (res.person || {}) as Record<string, any>

      if (needsEmail) {
        const candidates: string[] = []
        if (person.email && !isMaskedEmail(person.email)) candidates.push(person.email)
        if (Array.isArray(person.personal_emails)) {
          for (const e of person.personal_emails) {
            const val = typeof e === 'string' ? e : e?.email
            if (val && !isMaskedEmail(val)) candidates.push(val)
          }
        }
        if (Array.isArray(person.contact_emails)) {
          for (const e of person.contact_emails) {
            const val = typeof e === 'string' ? e : e?.email
            if (val && !isMaskedEmail(val)) candidates.push(val)
          }
        }
        if (candidates[0]) p.email = candidates[0]
      }

      if (needsPhone) {
        const phones = Array.isArray(person.phone_numbers) ? person.phone_numbers : []
        const first = phones[0]?.sanitized_number || phones[0]?.raw_number || person.phone || person.mobile_phone || null
        if (first) p.phone = String(first)
      }

      if (!p.credentials && typeof person.title === 'string') {
        const m = person.title.match(VET_CREDENTIAL_RE)
        if (m && m.length) {
          p.credentials = Array.from(new Set(m.map((s: string) => s.toUpperCase()))).slice(0, 4).join(', ')
        }
      }
      if (!p.linkedin_url && person.linkedin_url) p.linkedin_url = person.linkedin_url
    } catch (err) {
      logger.warn(
        `Apollo enrich failed for ${p.first_name} ${p.last_name}: ${(err as Error).message}`,
        'find-dvm-candidates',
      )
    }
  })

  // Run in batches of 5 to stay polite with Apollo's rate limits.
  const BATCH = 5
  for (let i = 0; i < tasks.length; i += BATCH) {
    await Promise.all(tasks.slice(i, i + BATCH).map(t => t()))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn enrichment — pull each prospect's public LinkedIn page through
// Tavily extract and parse credentials / email out of the visible text.
// ─────────────────────────────────────────────────────────────────────────────
async function enrichFromLinkedIn(list: DvmProspect[]): Promise<void> {
  const targets = list.filter(p => p.linkedin_url && (!p.credentials || isMaskedEmail(p.email)))
  if (!targets.length) return

  const tasks = targets.map((p) => async () => {
    try {
      const res = await tavilyExtract(p.linkedin_url!, { extract_depth: 'basic' })
      const content = (res.results || [])
        .map(r => r.raw_content || '')
        .join('\n')
        .trim()
      if (!content) return

      if (!p.credentials) {
        const matches = content.match(VET_CREDENTIAL_RE)
        if (matches && matches.length) {
          const unique = Array.from(new Set(matches.map((s: string) => s.toUpperCase())))
          // Prioritize DVM/VMD first, then specialty diplomate creds.
          const ordered = [
            ...unique.filter(c => c === 'DVM' || c === 'VMD' || c === 'BVSc' || c === 'BVMS' || c === 'MRCVS'),
            ...unique.filter(c => !['DVM', 'VMD', 'BVSc', 'BVMS', 'MRCVS'].includes(c)),
          ].slice(0, 4)
          if (ordered.length) p.credentials = ordered.join(', ')
        }
      }

      if (isMaskedEmail(p.email)) {
        const emailMatch = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
        if (emailMatch && !isMaskedEmail(emailMatch[0])) p.email = emailMatch[0]
      }
    } catch (err) {
      logger.warn(
        `LinkedIn extract failed for ${p.first_name} ${p.last_name}: ${(err as Error).message}`,
        'find-dvm-candidates',
      )
    }
  })

  const BATCH = 4
  for (let i = 0; i < tasks.length; i += BATCH) {
    await Promise.all(tasks.slice(i, i + BATCH).map(t => t()))
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// ACVS find-a-surgeon — official ACVS Diplomate Directory.
// Returns the most authoritative roster of board-certified veterinary
// surgeons in the U.S. / Canada. Only invoked when the requested
// specialty or keywords actually imply surgery.
// ─────────────────────────────────────────────────────────────────────────────

function specialtyImpliesSurgery(specialty: string, keywords: string[]): boolean {
  const hay = [specialty, ...keywords].join(' ').toLowerCase()
  return /\b(surgery|surgeon|dacvs)\b/.test(hay)
}

function inputToAcvsSpecies(input: Required<SearchInput>): AcvsSpeciesCode[] {
  const hay = [input.specialty, ...input.keywords].join(' ').toLowerCase()
  const species: AcvsSpeciesCode[] = []
  if (/\b(equine|horse)\b/.test(hay)) species.push('EQ_PRACT')
  if (/\b(food animal|cattle|dairy|swine|bovine|farm)\b/.test(hay)) {
    species.push('FA_PRACT')
    species.push('LA_PRACT')
  }
  if (/\b(large animal|la-im)\b/.test(hay)) species.push('LA_PRACT')
  // Default to small animal when nothing more specific was said.
  if (!species.length || /\b(small animal|sa|canine|feline|dog|cat|companion)\b/.test(hay)) {
    species.push('SA_PRACT')
  }
  return Array.from(new Set(species))
}

function acvsSurgeonToProspect(s: AcvsSurgeon): DvmProspect {
  // The match score is anchored at 90 because every ACVS-directory
  // result is, by definition, a board-certified DACVS — the strongest
  // possible signal for a surgeon search. Specialty-match scoring then
  // boosts it further to keep these at the very top of the list.
  const speciesStr = s.species.length ? ` (${s.species.join(', ')})` : ''
  return {
    first_name: s.first_name,
    last_name: s.last_name,
    credentials: s.credentials || 'DVM, DACVS',
    specialty: `Veterinary Surgery — ACVS Diplomate${speciesStr}`,
    current_employer: null,
    city: s.city,
    state: s.state,
    email: s.email,
    phone: s.phone,
    linkedin_url: null,
    website_url: s.profile_url,
    source_name: 'ACVS Diplomate Directory',
    source_url: s.profile_url || ACVS_DIRECTORY_URL,
    experience_years: null,
    vet_school: null,
    graduation_year: null,
    residency: null,
    actively_seeking: false,
    notes: s.address ? `ACVS-listed practice address: ${s.address}` : null,
    match_score: 90,
    provider: 'acvs',
  }
}

async function searchAcvsDirectoryForInput(input: Required<SearchInput>): Promise<DvmProspect[]> {
  if (!specialtyImpliesSurgery(input.specialty, input.keywords)) return []

  const state = extractStateFromLocation(input.location)
  const zipMatch = input.location.match(/\b(\d{5})\b/)
  const species = inputToAcvsSpecies(input)

  // ACVS's allowed distance buckets — snap user input to the nearest.
  const distanceBuckets = [3, 5, 10, 25, 50, 100, 250, 500] as const
  const snapped = distanceBuckets.reduce<typeof distanceBuckets[number]>((best, v) =>
    Math.abs(v - input.radiusMiles) < Math.abs(best - input.radiusMiles) ? v : best,
    distanceBuckets[0])

  const surgeons = await searchAcvsDirectory({
    state,
    zip: zipMatch ? zipMatch[1] : undefined,
    distanceMiles: zipMatch ? snapped : undefined,
    species,
    maxResults: Math.min(Math.max(input.maxResults * 2, 25), 200),
  })

  return surgeons.map(acvsSurgeonToProspect)
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialty-aware scoring.
//
// We compute a 0-100 alignment score per prospect that captures how well
// the prospect's credentials, declared specialty, and source align with
// the user-requested specialty. This is used as the primary sort key so
// — for example — searching for "Surgeon" puts DACVS specialists ahead
// of generalist DVMs.
// ─────────────────────────────────────────────────────────────────────────────

interface SpecialtyTarget {
  /** Credential strings (uppercase) that are strong evidence of this specialty. */
  credentials: string[]
  /** Substring keywords (lowercase) that we look for in `specialty` / `notes`. */
  keywords: string[]
  /** Sources that are by-definition correct for this specialty. */
  sourceMatchRe?: RegExp
}

const SPECIALTY_TARGETS: Array<{ test: RegExp; target: SpecialtyTarget }> = [
  {
    test: /\b(surgery|surgeon)\b/i,
    target: {
      credentials: ['DACVS', 'DACVS-SA', 'DACVS-LA'],
      keywords: ['surgery', 'surgeon', 'surgical'],
      sourceMatchRe: /acvs|acvs diplomate/i,
    },
  },
  {
    test: /\b(internal medicine|internist)\b/i,
    target: {
      credentials: ['DACVIM'],
      keywords: ['internal medicine', 'internist', 'sa-im', 'la-im'],
      sourceMatchRe: /acvim/i,
    },
  },
  {
    test: /\b(emergency|criticalist|critical care|ecc)\b/i,
    target: {
      credentials: ['DACVECC'],
      keywords: ['emergency', 'criticalist', 'critical care', 'ecc', 'er '],
      sourceMatchRe: /acvecc/i,
    },
  },
  {
    test: /\b(cardio)/i,
    target: { credentials: ['DACVIM'], keywords: ['cardiology', 'cardiologist'] },
  },
  {
    test: /\b(onco)/i,
    target: { credentials: ['DACVIM'], keywords: ['oncology', 'oncologist'] },
  },
  {
    test: /\b(neuro)/i,
    target: { credentials: ['DACVIM'], keywords: ['neurology', 'neurologist', 'neurosurgery'] },
  },
  {
    test: /\b(derm)/i,
    target: { credentials: ['DACVD'], keywords: ['dermatology', 'dermatologist'], sourceMatchRe: /acvd/i },
  },
  {
    test: /\b(ophthal)/i,
    target: { credentials: ['DACVO'], keywords: ['ophthalmology', 'ophthalmologist', 'eye'], sourceMatchRe: /acvo/i },
  },
  {
    test: /\b(anesth)/i,
    target: { credentials: ['DACVAA'], keywords: ['anesthesia', 'anesthesiology', 'anesthesiologist'], sourceMatchRe: /acvaa/i },
  },
  {
    test: /\b(dent)/i,
    target: { credentials: ['DAVDC'], keywords: ['dental', 'dentistry', 'dentist'], sourceMatchRe: /avdc/i },
  },
  {
    test: /\b(radio|imaging|ultrasound|mri)\b/i,
    target: { credentials: ['DACVR'], keywords: ['radiology', 'radiologist', 'imaging'], sourceMatchRe: /acvr/i },
  },
  {
    test: /\b(behavior|behaviorist)\b/i,
    target: { credentials: ['DACVB'], keywords: ['behavior', 'behaviorist'] },
  },
]

/**
 * Compute a 0-100 specialty-match score for the prospect given the
 * requested search criteria. Larger = better alignment.
 *
 * Scoring breakdown (additive, capped at 100):
 *   +45  credentials contain a target diplomate credential
 *   +25  specialty / notes text contains a target keyword
 *   +15  source comes from a specialty-college directory
 *   +10  source is ACVS Diplomate Directory (only when surgery requested)
 *   +5   declared specialty literally contains the requested term
 *   +5   vet school is a VIRMP feeder (mild boost — residency-eligible)
 *
 * If the requested specialty is a non-specialist role (general practice,
 * new graduate), credential-bearing specialists get a small penalty so
 * they don't dominate the generalist results.
 */
function computeSpecialtyMatch(p: DvmProspect, input: Required<SearchInput>): number {
  const requested = input.specialty || ''
  const wantsGeneralist = /\b(general practice|gp|associate veterinarian|new graduate)\b/i.test(requested)

  const blob = [
    p.specialty || '',
    p.notes || '',
    p.credentials || '',
    p.source_name || '',
  ].join(' ').toLowerCase()
  const creds = (p.credentials || '').toUpperCase()
  const source = (p.source_name || '').toLowerCase()

  const matchedTarget = SPECIALTY_TARGETS.find(t => t.test.test(requested))?.target

  if (!matchedTarget) {
    // No targeted specialty — fall back to provider match_score with mild
    // boosts for credential-clarity and active-seeker signal.
    let s = p.match_score ?? 50
    if (/\bDVM\b|\bVMD\b/.test(creds)) s += 5
    if (p.actively_seeking) s += 10
    if (wantsGeneralist && /\bDAC|DAVDC|DABVP\b/.test(creds)) s -= 15
    return clamp(s, 0, 100)
  }

  let score = 0

  // Credential alignment is the strongest signal (boards never lie).
  if (matchedTarget.credentials.some(c => creds.includes(c))) score += 45

  // Keyword alignment in declared specialty / notes / source.
  if (matchedTarget.keywords.some(k => blob.includes(k))) score += 25

  // Source-of-truth alignment (e.g. ACVS directory → surgery search).
  if (matchedTarget.sourceMatchRe && matchedTarget.sourceMatchRe.test(source)) score += 15
  if (/\b(surgery|surgeon)\b/i.test(requested) && /acvs/.test(source)) score += 10

  // Literal echo of the requested term in the declared specialty.
  if (requested && (p.specialty || '').toLowerCase().includes(requested.toLowerCase())) score += 5

  // VIRMP feeder school — small bump because their alumni are
  // disproportionately residency-trained.
  if (isVirmpFeederSchool(p.vet_school)) score += 5

  // Active job-board hits get a nudge.
  if (p.actively_seeking) score += 5

  // Penalize obvious generalists when a specialty was requested.
  if (creds && !creds.includes('DAC') && !creds.includes('DAVDC') && !creds.includes('DACVECC')) {
    score -= 10
  }

  // VIRMP category awareness — if the prospect's specialty string matches
  // a relevant VIRMP residency category, give a small boost. This helps
  // surface residency-trained or residency-bound DVMs.
  const virmpCats = matchVirmpCategories(requested, input.keywords)
  if (virmpCats.length && p.specialty) {
    const sp = p.specialty.toLowerCase()
    if (virmpCats.some(c => sp.includes(c.category.toLowerCase().split(/[^a-z]+/)[0]!))) {
      score += 5
    }
  }

  return clamp(score, 0, 100)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
