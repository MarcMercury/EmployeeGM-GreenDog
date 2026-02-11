/**
 * Agent Types — shared type definitions for the AI Agent Workforce system.
 */

// =====================================================
// Agent Registry
// =====================================================

export type AgentStatus = 'active' | 'paused' | 'disabled'
export type AgentCluster = 'skill_dev' | 'ops_hr' | 'engagement' | 'orchestration' | 'admin'
export type RunStatus = 'running' | 'success' | 'partial' | 'error'
export type TriggerType = 'cron' | 'event' | 'manual' | 'agent'
export type RiskLevel = 'low' | 'medium' | 'high'
export type ProposalStatus = 'pending' | 'auto_approved' | 'approved' | 'rejected' | 'applied' | 'expired'

export interface AgentRegistryRow {
  id: string
  agent_id: string
  display_name: string
  cluster: AgentCluster
  description: string | null
  status: AgentStatus
  schedule_cron: string | null
  last_run_at: string | null
  last_run_status: RunStatus | null
  last_run_duration_ms: number | null
  daily_token_budget: number
  daily_tokens_used: number
  budget_reset_at: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

// =====================================================
// Agent Proposals
// =====================================================

export type ProposalType =
  // Skill & Development (Phase 1)
  | 'new_skill'
  | 'skill_role_mapping'
  | 'skill_gap_report'
  | 'course_draft'
  | 'mentor_match'
  // Operations & HR (Phase 2)
  | 'profile_update_request'
  | 'schedule_draft'
  | 'attendance_flag'
  | 'payroll_anomaly'
  | 'compliance_alert'
  | 'compliance_report'
  | 'disciplinary_recommendation'
  // Reports (auto-generated summaries)
  | 'hr_audit_report'
  | 'attendance_report'
  // Engagement & Growth (Phase 3)
  | 'nudge'
  | 'review_reminder'
  | 'review_summary_draft'
  | 'engagement_alert'
  | 'engagement_report'
  // Referral Intelligence
  | 'referral_insight'
  // Orchestration (Phase 4)
  | 'health_report'
  // Access & Security
  | 'access_review'

export interface AgentProposalRow {
  id: string
  agent_id: string
  proposal_type: ProposalType
  title: string
  summary: string | null
  detail: Record<string, unknown>
  target_employee_id: string | null
  target_entity_type: string | null
  target_entity_id: string | null
  risk_level: RiskLevel
  status: ProposalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  applied_at: string | null
  expires_at: string | null
  created_at: string
}

// =====================================================
// Agent Runs
// =====================================================

export interface AgentRunRow {
  id: string
  agent_id: string
  started_at: string
  finished_at: string | null
  status: RunStatus
  trigger_type: TriggerType
  trigger_source: string | null
  proposals_created: number
  proposals_auto_approved: number
  tokens_used: number
  cost_usd: number
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// =====================================================
// Agent Handler Interface
// =====================================================

export interface AgentRunContext {
  agentId: string
  runId: string
  triggerType: TriggerType
  triggerSource?: string
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>
  config: Record<string, unknown>
}

export interface AgentRunResult {
  status: RunStatus
  proposalsCreated: number
  proposalsAutoApproved: number
  tokensUsed: number
  costUsd: number
  summary: string
  metadata?: Record<string, unknown>
}

// =====================================================
// Role Skill Expectations
// =====================================================

export type SkillImportance = 'required' | 'recommended' | 'optional'

export interface RoleSkillExpectationRow {
  id: string
  job_position_id: string
  skill_id: string
  expected_level: number
  importance: SkillImportance
  source: 'manual' | 'agent'
  agent_proposal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// Employee Skill Gaps
// =====================================================

export interface EmployeeSkillGapRow {
  id: string
  employee_id: string
  skill_id: string
  skill_name: string
  category: string | null
  current_level: number
  expected_level: number
  gap: number
  importance: SkillImportance
  has_course_available: boolean
  has_mentor_available: boolean
  computed_at: string
}

// =====================================================
// OpenAI Chat Types
// =====================================================

export interface AgentChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentChatOptions {
  agentId: string
  runId: string
  messages: AgentChatMessage[]
  model?: 'reasoning' | 'fast'
  responseFormat?: 'json' | 'text'
  maxTokens?: number
  temperature?: number
}

export interface AgentChatResult {
  content: string
  tokensUsed: number
  costUsd: number
  model: string
  durationMs: number
}

// =====================================================
// Proposal Detail Schemas (per proposal_type)
// =====================================================

export interface NewSkillDetail {
  name: string
  category: string
  description: string
  typical_roles: string[]
  suggested_level_range: [number, number]
  source_reasoning: string
}

export interface SkillRoleMappingDetail {
  job_position_id: string
  job_position_name: string
  mappings: Array<{
    skill_id: string
    skill_name: string
    expected_level: number
    importance: SkillImportance
    reasoning: string
  }>
}

export interface CourseDraftDetail {
  skill_id: string
  skill_name: string
  target_level: number
  title: string
  description: string
  estimated_hours: number
  lessons: Array<{
    title: string
    content_outline: string
    order: number
  }>
  quiz_questions: Array<{
    question: string
    options: string[]
    correct_indices: number[]
    explanation: string
  }>
  external_resources: Array<{
    title: string
    url: string
    type: 'video' | 'article' | 'pdf'
  }>
}

export interface MentorMatchDetail {
  mentee_employee_id: string
  mentee_name: string
  mentor_employee_id: string
  mentor_name: string
  skill_id: string
  skill_name: string
  mentee_level: number
  mentor_level: number
  match_score: number
  reasoning: string
}
