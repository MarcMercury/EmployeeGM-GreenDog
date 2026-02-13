/**
 * Proposal Appliers
 *
 * When a proposal is approved (by human or auto-approved by supervisor),
 * the applier executes the actual side effect — inserting into the target
 * table, sending a notification, etc.
 *
 * Each proposal_type maps to an applier function.
 */

import type { AgentProposalRow } from '~/types/agent.types'
import { markProposalApplied, getProposal } from './proposals'

type Applier = (proposal: AgentProposalRow, supabase: any) => Promise<void>

const applierMap = new Map<string, Applier>()

// ─── Skill & Development ──────────────────────────────────────────

applierMap.set('new_skill', async (proposal, supabase) => {
  const d = proposal.detail as any
  const { error } = await supabase
    .from('skill_library')
    .insert({
      name: d.name,
      category: d.category,
      description: d.description,
      source: 'agent',
      agent_proposal_id: proposal.id,
    })

  if (error) throw new Error(`Failed to insert skill: ${error.message}`)
})

applierMap.set('skill_role_mapping', async (proposal, supabase) => {
  const d = proposal.detail as any
  const rows = (d.mappings ?? []).map((m: any) => ({
    job_position_id: d.job_position_id,
    skill_id: m.skill_id,
    expected_level: m.expected_level,
    importance: m.importance,
    source: 'agent',
    agent_proposal_id: proposal.id,
    notes: m.reasoning,
  }))

  if (rows.length > 0) {
    const { error } = await supabase
      .from('role_skill_expectations')
      .upsert(rows, { onConflict: 'job_position_id,skill_id' })

    if (error) throw new Error(`Failed to upsert role mappings: ${error.message}`)
  }
})

applierMap.set('skill_gap_report', async (_proposal, _supabase) => {
  // Gap reports are informational — already written to employee_skill_gaps by the handler
  // Nothing to apply
})

applierMap.set('course_draft', async (proposal, supabase) => {
  const d = proposal.detail as any

  // Insert training course
  const { data: course, error: courseErr } = await supabase
    .from('training_courses')
    .insert({
      title: d.title,
      description: d.description,
      skill_id: d.skill_id,
      target_level: d.target_level,
      estimated_hours: d.estimated_hours,
      status: 'draft',
      source: 'agent',
      agent_proposal_id: proposal.id,
    })
    .select('id')
    .single()

  if (courseErr) throw new Error(`Failed to create course: ${courseErr.message}`)

  // Insert lessons
  if (d.lessons?.length > 0 && course?.id) {
    const lessonRows = d.lessons.map((l: any) => ({
      course_id: course.id,
      title: l.title,
      content: l.content_outline,
      sort_order: l.order,
    }))

    await supabase.from('training_lessons').insert(lessonRows)
  }
})

applierMap.set('mentor_match', async (proposal, supabase) => {
  const d = proposal.detail as any

  const { error } = await supabase
    .from('mentorships')
    .insert({
      mentor_employee_id: d.mentor_employee_id,
      mentee_employee_id: d.mentee_employee_id,
      skill_id: d.skill_id,
      status: 'proposed',
      match_score: d.match_score,
      source: 'agent',
    })

  if (error) throw new Error(`Failed to create mentorship: ${error.message}`)
})

// ─── Operations & HR ──────────────────────────────────────────────

applierMap.set('profile_update_request', async (proposal, supabase) => {
  // HR Auditor flagged missing fields — create a notification for the employee
  const d = proposal.detail as any
  const employeeId = d.employee_profile_id ?? d.employee_id
  if (employeeId) {
    // Resolve profile_id from employee_id if needed
    let profileId = d.employee_profile_id
    if (!profileId && d.employee_id) {
      const { data: emp } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', d.employee_id)
        .single()
      profileId = emp?.profile_id
    }
    if (profileId) {
      await supabase.from('notifications').insert({
        profile_id: profileId,
        type: 'profile_incomplete',
        category: 'profile',
        title: '📝 Profile Update Needed',
        body: d.summary ?? proposal.summary ?? 'Please update your profile with missing information.',
        data: { proposal_id: proposal.id, missing_fields: d.missing_fields, url: '/profile', action_label: 'Update Profile' },
        is_read: false,
      })
    }
  }
})

applierMap.set('schedule_draft', async (_proposal, _supabase) => {
  // Schedule drafts are high-risk — they remain as proposals for manual review.
  // The admin applies them via the scheduling UI. No auto-apply.
})

applierMap.set('attendance_flag', async (proposal, supabase) => {
  // Create a notification for the employee's manager
  const d = proposal.detail as any
  // Resolve manager's profile_id from employee's manager_employee_id or employee_id
  let managerProfileId = d.manager_profile_id
  if (!managerProfileId && d.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('manager_employee_id')
      .eq('id', d.employee_id)
      .single()
    if (emp?.manager_employee_id) {
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', emp.manager_employee_id)
        .single()
      managerProfileId = manager?.profile_id
    }
  }
  if (managerProfileId) {
    await supabase.from('notifications').insert({
      profile_id: managerProfileId,
      type: 'attendance_alert',
      category: 'hr',
      title: `⚠️ Attendance Alert: ${d.employee_name ?? 'Employee'}`,
      body: proposal.summary,
      data: { proposal_id: proposal.id, employee_id: d.employee_id, url: '/roster', action_label: 'Review' },
      is_read: false,
    })
  }
})

applierMap.set('payroll_anomaly', async (proposal, supabase) => {
  const d = proposal.detail as any
  // Resolve manager's profile_id from the employee
  let managerProfileId = d.manager_profile_id
  if (!managerProfileId && d.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('manager_employee_id')
      .eq('id', d.employee_id)
      .single()
    if (emp?.manager_employee_id) {
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', emp.manager_employee_id)
        .single()
      managerProfileId = manager?.profile_id
    }
  }
  if (managerProfileId) {
    await supabase.from('notifications').insert({
      profile_id: managerProfileId,
      type: 'payroll_alert',
      category: 'hr',
      title: `💰 Payroll Alert: ${d.employee_name ?? 'Time Entry Issue'}`,
      body: proposal.summary,
      data: { proposal_id: proposal.id, employee_id: d.employee_id, url: '/roster', action_label: 'Review' },
      is_read: false,
    })
  }
})

applierMap.set('compliance_alert', async (proposal, supabase) => {
  const d = proposal.detail as any
  // Resolve profile_id from employee_id
  let profileId = d.employee_profile_id
  if (!profileId && d.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', d.employee_id)
      .single()
    profileId = emp?.profile_id
  }
  if (profileId) {
    await supabase.from('notifications').insert({
      profile_id: profileId,
      type: 'compliance_alert',
      category: 'hr',
      title: `🔒 Compliance: ${d.credential_type ?? d.entity_name ?? 'Action Required'}`,
      body: proposal.summary,
      data: { proposal_id: proposal.id, ...d, url: '/profile', action_label: 'Review' },
      is_read: false,
    })
  }
})

applierMap.set('disciplinary_recommendation', async (_proposal, _supabase) => {
  // High-risk — always requires manual handling by admin/HR
})

// ─── Summary Reports (informational — no side effects) ───────────

applierMap.set('hr_audit_report', async (_proposal, _supabase) => {
  // Informational — summary lives in the proposal
})

applierMap.set('attendance_report', async (_proposal, _supabase) => {
  // Informational — summary lives in the proposal
})

applierMap.set('compliance_report', async (_proposal, _supabase) => {
  // Informational — summary lives in the proposal
})

// ─── Engagement & Growth ──────────────────────────────────────────

applierMap.set('nudge', async (_proposal, _supabase) => {
  // Personal Coach already delivers notifications inline during the handler run
})

applierMap.set('review_reminder', async (_proposal, _supabase) => {
  // Review Orchestrator already delivers notifications inline
})

applierMap.set('review_summary_draft', async (proposal, supabase) => {
  // Write the AI draft summary into the performance_review record
  const d = proposal.detail as any
  if (d.review_id && d.draft_summary) {
    await supabase
      .from('performance_reviews')
      .update({ summary_comment: d.draft_summary })
      .eq('id', d.review_id)
  }
})

applierMap.set('engagement_alert', async (proposal, supabase) => {
  // Notify the employee's manager
  const d = proposal.detail as any
  if (d.manager_employee_id) {
    const { data: manager } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', d.manager_employee_id)
      .single()

    if (manager?.profile_id) {
      await supabase.from('notifications').insert({
        profile_id: manager.profile_id,
        type: 'engagement_alert',
        category: 'hr',
        title: `📉 Engagement Drop: ${d.employee_name}`,
        body: proposal.summary,
        data: { proposal_id: proposal.id, employee_id: d.employee_id, score: d.score_this_week, url: '/roster', action_label: 'Review' },
        is_read: false,
      })
    }
  }
})

applierMap.set('engagement_report', async (_proposal, _supabase) => {
  // Informational — weekly summary lives in the proposal
})

// ─── Referral Intelligence ────────────────────────────────────────

applierMap.set('referral_insight', async (_proposal, _supabase) => {
  // Insights are informational — displayed in dashboard
})

// ─── Orchestration ────────────────────────────────────────────────

applierMap.set('health_report', async (_proposal, _supabase) => {
  // Informational — displayed in agent dashboard
})

// ─── Access & Security ────────────────────────────────────────────

applierMap.set('access_review', async (_proposal, _supabase) => {
  // Access review findings are informational — admin reviews and applies fixes manually.
  // Missing pages can be added to page_definitions via the admin UI.
})

// ─── Main Entry Point ─────────────────────────────────────────────

/**
 * Apply an approved/auto-approved proposal by executing its side effect.
 * Returns true if applied successfully, false otherwise.
 */
export async function applyProposal(proposalId: string): Promise<boolean> {
  const proposal = await getProposal(proposalId)
  if (!proposal) {
    logger.warn('[Applier] Proposal not found', 'agent', { proposalId })
    return false
  }

  if (proposal.status !== 'approved' && proposal.status !== 'auto_approved') {
    logger.warn('[Applier] Proposal not in approvable state', 'agent', {
      proposalId,
      status: proposal.status,
    })
    return false
  }

  const applier = applierMap.get(proposal.proposal_type)
  if (!applier) {
    logger.warn('[Applier] No applier for proposal type', 'agent', {
      proposalId,
      type: proposal.proposal_type,
    })
    // Mark applied anyway — no side effect needed
    await markProposalApplied(proposalId)
    return true
  }

  try {
    const supabase = createAdminClient() as any
    await applier(proposal, supabase)
    await markProposalApplied(proposalId)
    logger.info(`[Applier] Applied proposal ${proposalId} (${proposal.proposal_type})`, 'agent')
    return true
  } catch (err) {
    logger.error(
      `[Applier] Failed to apply proposal ${proposalId}`,
      err instanceof Error ? err : undefined,
      'agent',
      { proposalType: proposal.proposal_type },
    )
    return false
  }
}

/**
 * Process all approved/auto-approved proposals that haven't been applied yet.
 * Called by the dispatcher cron as a sweep.
 */
export async function processApprovedProposals(): Promise<number> {
  const client = createAdminClient() as any

  const { data: proposals, error } = await client
    .from('agent_proposals')
    .select('id')
    .in('status', ['approved', 'auto_approved'])
    .is('applied_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error || !proposals) return 0

  let applied = 0
  for (const p of proposals) {
    const success = await applyProposal(p.id)
    if (success) applied++
  }

  return applied
}
