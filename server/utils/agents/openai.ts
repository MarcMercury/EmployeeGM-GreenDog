/**
 * Agent OpenAI Client
 * 
 * Shared LLM client for all agents. Wraps OpenAI API calls with:
 * - Automatic token counting and logging to ai_usage_log
 * - Budget checking (rejects if agent over daily limit)
 * - Retry with exponential backoff
 * - Structured JSON response parsing
 * - Model selection (gpt-4o for reasoning, gpt-4o-mini for simple tasks)
 */

import type { AgentChatOptions, AgentChatResult, AgentChatMessage } from '~/types/agent.types'

const MODEL_MAP = {
  reasoning: 'gpt-4o',
  fast: 'gpt-4o-mini',
} as const

// Approximate cost per 1K tokens (input + output blended)
const COST_PER_1K: Record<string, number> = {
  'gpt-4o': 0.0075,       // ~$2.50/1M input + $10/1M output blended
  'gpt-4o-mini': 0.0003,  // ~$0.15/1M input + $0.60/1M output blended
}

const MAX_RETRIES = 2
const RETRY_BASE_MS = 1000

/**
 * Call the OpenAI Chat Completions API with budget tracking and retries.
 * Throws if agent is over budget or if all retries fail.
 */
export async function agentChat(options: AgentChatOptions): Promise<AgentChatResult> {
  const config = useRuntimeConfig()
  const apiKey = config.openaiApiKey
  const baseUrl = config.openaiBaseUrl || 'https://api.openai.com/v1'

  if (!apiKey) {
    throw new Error('[AgentChat] OPENAI_API_KEY not configured')
  }

  const modelKey = options.model ?? 'fast'
  const model = MODEL_MAP[modelKey]
  const maxTokens = options.maxTokens ?? 4000
  const temperature = options.temperature ?? 0.3

  // Check budget before calling
  const client = createAdminClient()
  const { data: agent } = await client
    .from('agent_registry')
    .select('daily_token_budget, daily_tokens_used, budget_reset_at')
    .eq('agent_id', options.agentId)
    .single()

  if (agent) {
    // Reset daily budget if needed
    const resetAt = new Date(agent.budget_reset_at)
    const now = new Date()
    if (now.toDateString() !== resetAt.toDateString()) {
      await client
        .from('agent_registry')
        .update({ daily_tokens_used: 0, budget_reset_at: now.toISOString() })
        .eq('agent_id', options.agentId)
    } else if (agent.daily_tokens_used >= agent.daily_token_budget) {
      throw new Error(`[AgentChat] Agent "${options.agentId}" over daily token budget (${agent.daily_tokens_used}/${agent.daily_token_budget})`)
    }
  }

  // Build request body
  const body: Record<string, unknown> = {
    model,
    messages: options.messages.map((m: AgentChatMessage) => ({ role: m.role, content: m.content })),
    max_tokens: maxTokens,
    temperature,
  }

  if (options.responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  // Attempt with retries
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const startTime = Date.now()
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        // Retry on 429 (rate limit) or 5xx
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`OpenAI API ${response.status}: ${errorText}`)
          logger.warn(`[AgentChat] Retryable error (attempt ${attempt + 1})`, 'agent', {
            agentId: options.agentId,
            status: response.status,
          })
          continue
        }
        throw new Error(`OpenAI API ${response.status}: ${errorText}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number }
      }
      const durationMs = Date.now() - startTime
      const content = data.choices?.[0]?.message?.content ?? ''
      const tokensUsed = data.usage?.total_tokens ?? 0
      const costPerK = COST_PER_1K[model] ?? 0.001
      const costUsd = (tokensUsed / 1000) * costPerK

      // Log to ai_usage_log
      await client.from('ai_usage_log').insert({
        feature: `agent:${options.agentId}`,
        model,
        tokens_used: tokensUsed,
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        cost_usd: costUsd,
        duration_ms: durationMs,
        success: true,
        metadata: { run_id: options.runId },
      }).then(() => {}) // fire and forget

      // Update agent budget
      if (agent) {
        await client
          .from('agent_registry')
          .update({ daily_tokens_used: (agent.daily_tokens_used || 0) + tokensUsed })
          .eq('agent_id', options.agentId)
      }

      return {
        content,
        tokensUsed,
        costUsd,
        model,
        durationMs,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === MAX_RETRIES) break
    }
  }

  // All retries exhausted — log failure
  await client.from('ai_usage_log').insert({
    feature: `agent:${options.agentId}`,
    model,
    tokens_used: 0,
    cost_usd: 0,
    success: false,
    error_message: lastError?.message ?? 'Unknown error',
    metadata: { run_id: options.runId },
  }).then(() => {}).catch?.(() => {})

  throw lastError ?? new Error('[AgentChat] All retries exhausted')
}
