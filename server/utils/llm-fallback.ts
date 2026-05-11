/**
 * LLM Fallback Chain
 * ==================
 * Rotates through multiple AI models so that when one provider hits a
 * rate limit, daily quota, or transient outage we fall through to the
 * next model instead of failing the request.
 *
 * Two independent chains are exposed:
 *   • openaiChain — gpt-4o-mini → gpt-4o   (cheap → reasoning)
 *   • geminiChain — gemini-2.5-flash → gemini-2.0-flash → gemini-1.5-flash
 *
 * Each chain returns the first non-error response. A high-level
 * `runLlmChainsInParallel` helper runs both chains concurrently so we
 * keep the existing "two-LLM diversity" behavior of the DVM scout while
 * also tolerating any single-model failure.
 *
 * Error classification:
 *   - 429 / "rate limit" / "quota" → retry next model
 *   - 503 / 502 / 504 / "overloaded" → retry next model
 *   - Anything else → also retried (a model deprecation or 5xx still
 *     shouldn't take down the whole search)
 */

import { agentChat } from './agents/openai'
import { geminiGenerate } from './gemini'
import { logger } from './logger'

export interface LlmCallContext {
  systemPrompt: string
  userPrompt: string
  /** Optional grounding text appended to the user prompt. */
  grounding?: string
  temperature?: number
  maxTokens?: number
}

export interface LlmChainResult {
  /** Friendly provider name surfaced to the UI. */
  provider: 'openai' | 'gemini'
  /** Model variant that actually responded. */
  model: string
  /** Raw text content returned by the model. */
  raw: string
}

export interface LlmChainAttempt {
  provider: 'openai' | 'gemini'
  model: string
  ok: boolean
  error?: string
}

/** OpenAI model variants in fallback priority order. */
const OPENAI_VARIANTS: Array<{ key: 'fast' | 'reasoning'; label: string }> = [
  { key: 'reasoning', label: 'gpt-4o' },
  { key: 'fast', label: 'gpt-4o-mini' },
]

/** Gemini model variants in fallback priority order. */
const GEMINI_VARIANTS: string[] = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

function classifyError(err: unknown): {
  isRateLimit: boolean
  isOverloaded: boolean
  isAuth: boolean
  message: string
} {
  const e = err as { statusCode?: number; status?: number; message?: string; data?: { error?: { code?: number; status?: string; message?: string } } }
  const code = e?.statusCode ?? e?.status ?? e?.data?.error?.code
  const msg = (e?.message || e?.data?.error?.message || '').toLowerCase()
  return {
    isRateLimit: code === 429 || /rate.?limit|quota|too many requests|exceeded/i.test(msg),
    isOverloaded: code === 502 || code === 503 || code === 504 || /overloaded|unavailable|timeout/i.test(msg),
    isAuth: code === 401 || code === 403 || /unauthor|forbidden|invalid.?key/i.test(msg),
    message: e?.message || e?.data?.error?.message || String(err),
  }
}

/**
 * Try OpenAI models in priority order. Returns first successful
 * response, or null if every variant failed (auth errors short-circuit
 * the chain because retrying with the same bad key is pointless).
 */
export async function runOpenAiChain(
  ctx: LlmCallContext,
  attempts: LlmChainAttempt[] = [],
): Promise<LlmChainResult | null> {
  const userBody = ctx.grounding ? `${ctx.userPrompt}\n\n${ctx.grounding}` : ctx.userPrompt
  for (const variant of OPENAI_VARIANTS) {
    try {
      const result = await agentChat({
        agentId: 'dvm-candidate-scout',
        runId: `dvm-scout-${variant.key}-${Date.now()}`,
        messages: [
          { role: 'system', content: ctx.systemPrompt },
          { role: 'user', content: userBody },
        ],
        model: variant.key,
        maxTokens: ctx.maxTokens ?? 4000,
        temperature: ctx.temperature ?? 0.4,
        responseFormat: 'json',
      })
      attempts.push({ provider: 'openai', model: variant.label, ok: true })
      return { provider: 'openai', model: variant.label, raw: result.content }
    } catch (err) {
      const cls = classifyError(err)
      attempts.push({ provider: 'openai', model: variant.label, ok: false, error: cls.message })
      logger.warn(
        `OpenAI ${variant.label} failed (${cls.isRateLimit ? 'rate-limit' : cls.isOverloaded ? 'overloaded' : cls.isAuth ? 'auth' : 'error'}): ${cls.message}`,
        'llm-fallback',
      )
      // Auth failure means every variant of this provider will fail
      // identically — stop walking the chain.
      if (cls.isAuth) return null
      // Otherwise continue to the next variant.
    }
  }
  return null
}

/**
 * Try Gemini models in priority order, prefixing the prompt with the
 * system message (Gemini doesn't expose a separate system role over
 * the v1beta generateContent endpoint that we use).
 */
export async function runGeminiChain(
  ctx: LlmCallContext,
  attempts: LlmChainAttempt[] = [],
): Promise<LlmChainResult | null> {
  const prompt = [
    ctx.systemPrompt,
    ctx.userPrompt,
    ctx.grounding,
    'Return ONLY valid JSON in the exact schema requested.',
  ].filter(Boolean).join('\n\n')

  for (const model of GEMINI_VARIANTS) {
    try {
      const raw = await geminiGenerate(prompt, {
        model,
        temperature: ctx.temperature ?? 0.4,
        maxTokens: ctx.maxTokens ?? 4000,
      })
      attempts.push({ provider: 'gemini', model, ok: true })
      return { provider: 'gemini', model, raw }
    } catch (err) {
      const cls = classifyError(err)
      attempts.push({ provider: 'gemini', model, ok: false, error: cls.message })
      logger.warn(
        `Gemini ${model} failed (${cls.isRateLimit ? 'rate-limit' : cls.isOverloaded ? 'overloaded' : cls.isAuth ? 'auth' : 'error'}): ${cls.message}`,
        'llm-fallback',
      )
      if (cls.isAuth) return null
    }
  }
  return null
}

export interface LlmParallelResult {
  results: LlmChainResult[]
  attempts: LlmChainAttempt[]
}

/**
 * Run both provider chains concurrently. Returns whichever ones
 * succeeded (typically both, sometimes one, occasionally zero if every
 * model in every chain is gated). Use the `attempts` array to surface
 * a per-model status table to the UI.
 */
export async function runLlmChainsInParallel(
  ctx: LlmCallContext,
  flags: { hasOpenAI: boolean; hasGemini: boolean },
): Promise<LlmParallelResult> {
  const attempts: LlmChainAttempt[] = []
  const pending: Promise<LlmChainResult | null>[] = []
  if (flags.hasOpenAI) pending.push(runOpenAiChain(ctx, attempts))
  if (flags.hasGemini) pending.push(runGeminiChain(ctx, attempts))
  const settled = await Promise.all(pending)
  const results = settled.filter((r): r is LlmChainResult => r != null)
  return { results, attempts }
}
