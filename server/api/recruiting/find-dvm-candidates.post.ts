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
import { verifyDvmInNpi } from '../../utils/npi-registry'
import {
  buildStateBoardSearchUrl,
  getDiplomateDirectoryByCredential,
  isAvmaAccreditedSchool,
} from '../../utils/state-vet-boards'

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
  provider: 'openai' | 'gemini' | 'merged'
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

  if (!hasOpenAI && !hasGemini) {
    throw createError({
      statusCode: 503,
      message: 'No AI providers configured. Set OPENAI_API_KEY and/or GEMINI_API_KEY.',
    })
  }

  const systemPrompt = buildSystemPrompt(input)
  const userPrompt = buildUserPrompt(input)

  const providerPromises: Promise<{ provider: 'openai' | 'gemini'; raw: string } | null>[] = []

  if (hasOpenAI) {
    providerPromises.push(
      (async () => {
        try {
          const result = await agentChat({
            agentId: 'dvm-candidate-scout',
            runId: `dvm-scout-${Date.now()}`,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            model: 'reasoning',
            maxTokens: 4000,
            temperature: 0.4,
            responseFormat: 'json',
          })
          return { provider: 'openai' as const, raw: result.content }
        } catch (err) {
          logger.error('OpenAI DVM scout failed', err as Error, 'find-dvm-candidates')
          return null
        }
      })()
    )
  }

  if (hasGemini) {
    providerPromises.push(
      (async () => {
        try {
          const raw = await geminiGenerate(
            `${systemPrompt}\n\n${userPrompt}\n\nReturn ONLY valid JSON in the exact schema requested.`,
            { temperature: 0.4, maxTokens: 4000 },
          )
          return { provider: 'gemini' as const, raw }
        } catch (err) {
          logger.error('Gemini DVM scout failed', err as Error, 'find-dvm-candidates')
          return null
        }
      })()
    )
  }

  const settled = await Promise.all(providerPromises)
  const allProspects: DvmProspect[] = []
  const providerErrors: string[] = []

  for (const r of settled) {
    if (!r) {
      providerErrors.push('one provider failed')
      continue
    }
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

  return {
    success: true,
    count: sorted.length,
    prospects: sorted,
    providers: {
      openai: hasOpenAI,
      gemini: hasGemini,
    },
    warnings: buildWarnings(hasOpenAI, hasGemini, providerErrors, droppedOutsideRadius),
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

function buildWarnings(hasOpenAI: boolean, hasGemini: boolean, providerErrors: string[], droppedOutsideRadius = 0): string[] {
  const warnings: string[] = []
  if (!hasOpenAI) warnings.push('OPENAI_API_KEY not set — OpenAI provider skipped.')
  if (!hasGemini) warnings.push('GEMINI_API_KEY not set — Gemini provider skipped.')
  if (providerErrors.length) warnings.push('One or more providers errored — partial results returned.')
  if (droppedOutsideRadius > 0) warnings.push(`${droppedOutsideRadius} prospect(s) dropped after OSM-based radius enforcement.`)
  warnings.push('Results are limited to publicly indexed sources. To search LinkedIn Recruiter, paid job boards, or gated directories, additional API credentials are required (e.g. LinkedIn Talent Solutions, Indeed Hiring, ZipRecruiter Partner API).')
  return warnings
}
