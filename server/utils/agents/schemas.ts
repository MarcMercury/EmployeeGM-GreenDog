/**
 * Zod Schemas for Agent Proposal Payloads
 *
 * Validates the `detail` field of agent proposals before insertion.
 * Each proposal_type has a corresponding schema.
 */

import { z } from 'zod'

// ─── Skill & Development ──────────────────────────────────────────

export const NewSkillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  typical_roles: z.array(z.string()).optional(),
  suggested_level_range: z.tuple([z.number().int().min(1).max(5), z.number().int().min(1).max(5)]).optional(),
  source_reasoning: z.string().optional(),
})

export const SkillRoleMappingSchema = z.object({
  job_position_id: z.string().uuid(),
  job_position_name: z.string(),
  mappings: z.array(z.object({
    skill_id: z.string().uuid(),
    skill_name: z.string(),
    expected_level: z.number().int().min(1).max(5),
    importance: z.enum(['required', 'recommended', 'optional']),
    reasoning: z.string().optional(),
  })),
})

export const SkillGapReportSchema = z.object({
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  gaps_found: z.number().int().min(0),
  top_gaps: z.array(z.object({
    skill_name: z.string(),
    current_level: z.number(),
    expected_level: z.number(),
    gap: z.number(),
  })).optional(),
})

export const CourseDraftSchema = z.object({
  skill_id: z.string().uuid(),
  skill_name: z.string(),
  target_level: z.number().int().min(1).max(5),
  title: z.string().min(1),
  description: z.string(),
  estimated_hours: z.number().positive(),
  lessons: z.array(z.object({
    title: z.string(),
    content_outline: z.string(),
    order: z.number().int(),
  })).optional(),
  quiz_questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correct_indices: z.array(z.number()),
    explanation: z.string().optional(),
  })).optional(),
  external_resources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    type: z.enum(['video', 'article', 'pdf']),
  })).optional(),
})

export const MentorMatchSchema = z.object({
  mentee_employee_id: z.string().uuid(),
  mentee_name: z.string(),
  mentor_employee_id: z.string().uuid(),
  mentor_name: z.string(),
  skill_id: z.string().uuid(),
  skill_name: z.string(),
  mentee_level: z.number().int().min(0).max(5),
  mentor_level: z.number().int().min(1).max(5),
  match_score: z.number().min(0).max(100),
  reasoning: z.string().optional(),
})

// ─── Operations & HR ──────────────────────────────────────────────

export const ProfileUpdateRequestSchema = z.object({
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  employee_profile_id: z.string().uuid().optional(),
  missing_fields: z.array(z.string()),
  completeness_score: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
})

export const ScheduleDraftSchema = z.object({
  location_id: z.string().uuid(),
  location_name: z.string(),
  week_start: z.string(),
  shifts: z.array(z.object({
    employee_id: z.string().uuid(),
    employee_name: z.string(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    position: z.string().optional(),
  })),
})

export const AttendanceFlagSchema = z.object({
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  manager_profile_id: z.string().uuid().optional(),
  reliability_score: z.number().min(0).max(100).optional(),
  issue_type: z.enum(['low_attendance', 'excessive_lateness', 'no_show_pattern', 'disciplinary']).optional(),
  details: z.record(z.unknown()).optional(),
})

export const PayrollAnomalySchema = z.object({
  employee_id: z.string().uuid().optional(),
  employee_name: z.string().optional(),
  manager_profile_id: z.string().uuid().optional(),
  anomaly_type: z.enum([
    'missing_clock_out', 'excessive_hours', 'overtime_risk',
    'approaching_overtime', 'unapproved_entry', 'duplicate_entry',
  ]).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  details: z.record(z.unknown()).optional(),
})

export const ComplianceAlertSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employee_name: z.string().optional(),
  employee_profile_id: z.string().uuid().optional(),
  credential_type: z.enum(['license', 'certification', 'ce_credits', 'training']).optional(),
  credential_name: z.string().optional(),
  expires_at: z.string().optional(),
  days_until_expiry: z.number().optional(),
  urgency: z.enum(['info', 'warning', 'urgent', 'expired']).optional(),
})

// ─── Engagement & Growth ──────────────────────────────────────────

export const NudgeSchema = z.object({
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  message: z.string(),
  context_used: z.string().optional(),
})

export const ReviewReminderSchema = z.object({
  review_cycle_id: z.string().uuid(),
  cycle_name: z.string(),
  review_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  manager_name: z.string().optional(),
  days_until_due: z.number(),
  current_stage: z.string().optional(),
  status: z.string().optional(),
})

export const ReviewSummaryDraftSchema = z.object({
  review_cycle_id: z.string().uuid(),
  review_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  draft_summary: z.string(),
  self_review_count: z.number().optional(),
  manager_review_count: z.number().optional(),
  overall_rating: z.number().optional().nullable(),
})

export const EngagementAlertSchema = z.object({
  employee_id: z.string().uuid(),
  employee_name: z.string(),
  manager_employee_id: z.string().uuid().optional().nullable(),
  score_this_week: z.number().min(0).max(100),
  score_last_week: z.number().min(0).max(100),
  decline_percent: z.number(),
  activity_breakdown: z.record(z.number()).optional(),
  suggested_actions: z.array(z.string()).optional(),
})

export const EngagementReportSchema = z.object({
  total_employees: z.number(),
  average_score: z.number(),
  flagged_count: z.number(),
  declining_count: z.number().optional(),
  low_score_count: z.number().optional(),
  score_distribution: z.record(z.number()).optional(),
  top_engaged: z.array(z.object({ name: z.string(), score: z.number() })).optional(),
  most_at_risk: z.array(z.object({ name: z.string(), score: z.number(), decline: z.number() })).optional(),
})

// ─── Referral Intelligence ────────────────────────────────────────

export const ReferralInsightSchema = z.object({
  insight_type: z.enum(['trend', 'opportunity', 'risk', 'recommendation']).optional(),
  partner_id: z.string().uuid().optional(),
  partner_name: z.string().optional(),
  summary: z.string(),
  data: z.record(z.unknown()).optional(),
})

// ─── Orchestration ────────────────────────────────────────────────

export const HealthReportSchema = z.object({
  issues: z.array(z.string()),
  agent_statuses: z.array(z.object({
    agent_id: z.string(),
    name: z.string(),
    cluster: z.string(),
    tokens_today: z.number().optional(),
    budget: z.number().optional(),
  })).optional(),
  stuck_runs_killed: z.number().optional(),
})

// ─── Schema Registry ──────────────────────────────────────────────

export const proposalSchemas: Record<string, z.ZodType<any>> = {
  new_skill: NewSkillSchema,
  skill_role_mapping: SkillRoleMappingSchema,
  skill_gap_report: SkillGapReportSchema,
  course_draft: CourseDraftSchema,
  mentor_match: MentorMatchSchema,
  profile_update_request: ProfileUpdateRequestSchema,
  schedule_draft: ScheduleDraftSchema,
  attendance_flag: AttendanceFlagSchema,
  payroll_anomaly: PayrollAnomalySchema,
  compliance_alert: ComplianceAlertSchema,
  nudge: NudgeSchema,
  review_reminder: ReviewReminderSchema,
  review_summary_draft: ReviewSummaryDraftSchema,
  engagement_alert: EngagementAlertSchema,
  engagement_report: EngagementReportSchema,
  referral_insight: ReferralInsightSchema,
  health_report: HealthReportSchema,
}

/**
 * Validate a proposal detail payload against its schema.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateProposalDetail(
  proposalType: string,
  detail: unknown,
): { success: true; data: any } | { success: false; errors: string[] } {
  const schema = proposalSchemas[proposalType]
  if (!schema) {
    // No schema defined — allow passthrough
    return { success: true, data: detail }
  }

  const result = schema.safeParse(detail)
  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  }
}
