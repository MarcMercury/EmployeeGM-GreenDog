/**
 * Agent API Response Schemas
 *
 * Zod schemas describing the response shapes of /api/agents/* endpoints.
 * These are the canonical contracts; UI consumers and CI contract tests
 * import from here to prevent silent drift.
 */
import { z } from 'zod'

// ─── /api/agents/health ──────────────────────────────────────

export const agentHealthMetricsSchema = z.object({
  activeAgentCount: z.number().int().nonnegative(),
  recentSuccessCount: z.number().int().nonnegative(),
  recentErrorCount: z.number().int().nonnegative(),
  staleAgentCount: z.number().int().nonnegative(),
  staleAgentIds: z.array(z.string()),
})

export const agentHealthSuccessSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  message: z.string(),
  openai: z.boolean(),
  recentSuccess: z.boolean(),
  hasActiveAgents: z.boolean(),
  metrics: agentHealthMetricsSchema,
  lastUpdated: z.string(),
})

export const agentHealthErrorSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
  openai: z.boolean(),
  error: z.string(),
  lastUpdated: z.string(),
})

export const agentHealthResponseSchema = z.union([
  agentHealthSuccessSchema,
  agentHealthErrorSchema,
])

// ─── /api/agents (list) ──────────────────────────────────────

export const agentRegistryRowSchema = z.object({
  agent_id: z.string(),
  display_name: z.string().nullable().optional(),
  cluster: z.string().nullable().optional(),
  status: z.string(),
  schedule_cron: z.string().nullable().optional(),
  last_run_at: z.string().nullable().optional(),
  last_run_status: z.string().nullable().optional(),
}).passthrough()

export const agentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    agents: z.array(agentRegistryRowSchema),
    stats: z.object({
      proposals: z.unknown(),
      runs: z.unknown(),
    }),
  }),
})

// ─── /api/agents/[agentId]/runs (list) ───────────────────────

export const agentRunRowSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  status: z.string(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
}).passthrough()

// ─── Type exports ────────────────────────────────────────────

export type AgentHealthResponse = z.infer<typeof agentHealthResponseSchema>
export type AgentHealthSuccess = z.infer<typeof agentHealthSuccessSchema>
export type AgentListResponse = z.infer<typeof agentListResponseSchema>
