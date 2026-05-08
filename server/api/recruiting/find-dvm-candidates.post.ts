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
import { apolloPeopleSearch, type ApolloPerson } from '../../utils/apollo'
import { tavilySearch } from '../../utils/tavily'
import { googleSearch } from '../../utils/googleSearch'

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
  provider: 'openai' | 'gemini' | 'apollo' | 'npi' | 'tavily' | 'google_cse' | 'merged'
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
  const [apolloRes, npiRes, tavilyRes, googleRes] = await Promise.all([
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
  ])

  logger.info(
    `Direct providers: apollo=${apolloRes.length} npi=${npiRes.length} tavily=${tavilyRes.prospects.length} google=${googleRes.prospects.length}`,
    'find-dvm-candidates',
  )

  // Combine web snippets so LLMs have grounding context
  const webSnippets = [...tavilyRes.snippets, ...googleRes.snippets].slice(0, 30)
  const groundingBlock = buildGroundingBlock(webSnippets)

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
              { role: 'user', content: `${userPrompt}\n\n${groundingBlock}` },
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
            `${systemPrompt}\n\n${userPrompt}\n\n${groundingBlock}\n\nReturn ONLY valid JSON in the exact schema requested.`,
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
  ]

  for (const r of settled) {
    if (!r) continue
    const parsed = parseProspects(r.raw, r.provider)
    allProspects.push(...parsed)
  }

  // Deduplicate by name + employer + city
  const merged = mergeProspects(allProspects)
  let sorted = merged
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, input.maxResults)

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
    email: p.email || null,
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

function buildSearchQueries(input: Required<SearchInput>): string[] {
  const role = input.specialty || 'veterinarian'
  const loc = input.location || ''
  const queries = [
    `${role} DVM "${loc}" site:linkedin.com/in`,
    `${role} veterinarian ${loc} hospital staff`,
    `${role} veterinarian ${loc} "Meet the Doctors"`,
    `DVM ${loc} jobs.avma.org OR careers.aaha.org OR jobs.acvs.org OR jobs.acvim.org`,
  ]
  if (input.activeOnly) {
    queries.push(`"open to work" OR "actively seeking" DVM ${loc}`)
    queries.push(`veterinarian ${loc} ihireveterinary.com OR vetcandy.com`)
  }
  return queries.slice(0, input.activeOnly ? 6 : 4)
}

function snippetToProspect(s: WebSnippet, provider: 'tavily' | 'google_cse'): DvmProspect | null {
  // Try to extract "First Last, DVM" or "Dr. First Last" from the title
  const title = s.title || ''
  const cleaned = title.replace(/\s*[-|–].*$/, '').replace(/^Dr\.?\s+/i, '').trim()
  const credMatch = cleaned.match(/\b(DVM|VMD|DACVS|DACVIM|DACVO|DACVD|DACVECC|DACVAA|DAVDC|DACVR)\b/i)
  const credentials = credMatch ? credMatch[1].toUpperCase() : null
  const stripped = cleaned.replace(/,?\s*\b(DVM|VMD|DACVS|DACVIM|DACVO|DACVD|DACVECC|DACVAA|DAVDC|DACVR)\b/gi, '').trim()

  // Need at least "First Last"
  const parts = stripped.split(/\s+/).filter(p => /^[A-Z][a-zA-Z'’\-]+$/.test(p))
  if (parts.length < 2) return null
  const first = parts[0]!
  const last = parts[parts.length - 1]!

  return {
    first_name: first,
    last_name: last,
    credentials,
    specialty: null,
    current_employer: null,
    city: null,
    state: null,
    email: null,
    phone: null,
    linkedin_url: /linkedin\.com\/in\//i.test(s.url) ? s.url : null,
    website_url: s.url,
    source_name: provider === 'tavily' ? 'Tavily web search' : 'Google Custom Search',
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
