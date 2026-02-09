/**
 * Agent C2: Review Orchestrator
 *
 * Automates the performance review lifecycle: opens cycles, creates review
 * instances, sends reminders, and drafts AI summaries.
 *
 * Reads: review_cycles, performance_reviews, review_responses, review_participants,
 *        review_signoffs, employees
 * Writes: agent_proposals (review_reminder, review_summary_draft types)
 * LLM: gpt-4o-mini for review summary drafts
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

// Reminder intervals in days before due date
const REMINDER_DAYS = [7, 3, 1]

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting review orchestration`, 'agent', { runId })

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // 1. Fetch active review cycles
  const { data: cycles, error: cyclesErr } = await supabase
    .from('review_cycles')
    .select('id, name, period_start, period_end, due_date, status')
    .in('status', ['open', 'in_review'])

  if (cyclesErr) {
    throw new Error(`Failed to fetch review cycles: ${cyclesErr.message}`)
  }

  if (!cycles || cycles.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'No active review cycles found.',
    }
  }

  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  let totalTokens = 0
  let totalCost = 0

  // Avoid duplicate reminders
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentReminders } = await supabase
    .from('agent_proposals')
    .select('target_employee_id, detail')
    .eq('agent_id', agentId)
    .in('proposal_type', ['review_reminder', 'review_summary_draft'])
    .gte('created_at', oneDayAgo)

  const recentReminderKeys = new Set(
    (recentReminders ?? []).map((p: any) => `${p.target_employee_id}:${p.detail?.review_cycle_id ?? ''}`)
  )

  for (const cycle of cycles) {
    const dueDate = new Date(cycle.due_date)
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // 2. Get all performance reviews for this cycle
    const { data: reviews } = await supabase
      .from('performance_reviews')
      .select(`
        id, employee_id, manager_employee_id, current_stage, status,
        overall_rating, calibrated_rating, summary_comment
      `)
      .eq('review_cycle_id', cycle.id)

    if (!reviews || reviews.length === 0) continue

    // 3. Get employee details
    const empIds = [...new Set([
      ...reviews.map((r: any) => r.employee_id),
      ...reviews.map((r: any) => r.manager_employee_id).filter(Boolean),
    ])]

    const { data: employees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, profile_id')
      .in('id', empIds)

    const empMap = new Map<string, any>()
    for (const emp of (employees ?? [])) {
      empMap.set(emp.id, emp)
    }

    // 4. Check for incomplete reviews and send reminders
    const incompleteReviews = reviews.filter((r: any) =>
      r.status !== 'completed' && r.status !== 'signed_off'
    )

    const shouldRemind = REMINDER_DAYS.some(d => daysUntilDue === d) || daysUntilDue <= 0

    if (shouldRemind && incompleteReviews.length > 0) {
      for (const review of incompleteReviews) {
        const emp = empMap.get(review.employee_id)
        const manager = empMap.get(review.manager_employee_id)
        if (!emp) continue

        // Remind the employee
        const empKey = `${review.employee_id}:${cycle.id}`
        if (!recentReminderKeys.has(empKey)) {
          const urgency = daysUntilDue <= 0 ? 'OVERDUE' : daysUntilDue <= 1 ? 'DUE TOMORROW' : `${daysUntilDue} days remaining`

          const proposalId = await createProposal({
            agentId,
            proposalType: 'review_reminder',
            title: `Review Reminder: ${emp.first_name} ${emp.last_name} — ${urgency}`,
            summary: `${cycle.name} review is ${urgency.toLowerCase()}. Current stage: ${review.current_stage ?? 'not started'}.`,
            detail: {
              review_cycle_id: cycle.id,
              cycle_name: cycle.name,
              review_id: review.id,
              employee_id: review.employee_id,
              employee_name: `${emp.first_name} ${emp.last_name}`,
              manager_name: manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned',
              days_until_due: daysUntilDue,
              current_stage: review.current_stage,
              status: review.status,
            },
            targetEmployeeId: review.employee_id,
            targetEntityType: 'performance_reviews',
            targetEntityId: review.id,
            riskLevel: daysUntilDue <= 0 ? 'medium' : 'low',
            expiresInHours: 48,
          })

          if (proposalId) {
            proposalsCreated++
            await autoApproveProposal(proposalId)
            proposalsAutoApproved++

            // Send notification
            if (emp.profile_id) {
              await supabase.from('notifications').insert({
                profile_id: emp.profile_id,
                type: 'review_reminder',
                title: `📋 Performance Review — ${urgency}`,
                body: `Your ${cycle.name} review is ${urgency.toLowerCase()}. Please complete it soon.`,
                data: { review_id: review.id, cycle_id: cycle.id },
                is_read: false,
              })
            }
          }
        }
      }
    }

    // 5. Draft AI summaries for completed reviews that lack them
    const reviewsNeedingSummary = reviews.filter((r: any) =>
      r.status === 'completed' && !r.summary_comment
    )

    for (const review of reviewsNeedingSummary.slice(0, 3)) { // Max 3 summaries per run
      const emp = empMap.get(review.employee_id)
      if (!emp) continue

      // Get review responses
      const { data: responses } = await supabase
        .from('review_responses')
        .select('question_key, responder_role, answer_text, answer_value')
        .eq('performance_review_id', review.id)

      if (!responses || responses.length === 0) continue

      const selfReviews = responses.filter((r: any) => r.responder_role === 'self')
      const managerReviews = responses.filter((r: any) => r.responder_role === 'manager')

      const chatResult = await agentChat({
        agentId,
        runId,
        messages: [
          {
            role: 'system',
            content: `You are an HR professional drafting a performance review summary for a veterinary practice employee. Be constructive, specific, and balanced. Highlight strengths and growth areas.`,
          },
          {
            role: 'user',
            content: `Draft a performance review summary for ${emp.first_name} ${emp.last_name}.

SELF-REVIEW RESPONSES:
${selfReviews.map((r: any) => `Q: ${r.question_key} → ${r.answer_text ?? r.answer_value}`).join('\n')}

MANAGER REVIEW RESPONSES:
${managerReviews.map((r: any) => `Q: ${r.question_key} → ${r.answer_text ?? r.answer_value}`).join('\n')}

Overall rating: ${review.overall_rating ?? 'Not yet rated'}

Write a 3-5 paragraph summary covering: key accomplishments, strengths, areas for development, and goals for next period.`,
          },
        ],
        model: 'fast',
        maxTokens: 1500,
        temperature: 0.5,
      })

      totalTokens += chatResult.tokensUsed
      totalCost += chatResult.costUsd

      const proposalId = await createProposal({
        agentId,
        proposalType: 'review_summary_draft',
        title: `Review Summary Draft: ${emp.first_name} ${emp.last_name}`,
        summary: `AI-generated summary for ${cycle.name} review. Manager should review and edit before publishing.`,
        detail: {
          review_cycle_id: cycle.id,
          review_id: review.id,
          employee_id: review.employee_id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          draft_summary: chatResult.content,
          self_review_count: selfReviews.length,
          manager_review_count: managerReviews.length,
          overall_rating: review.overall_rating,
        },
        targetEmployeeId: review.employee_id,
        targetEntityType: 'performance_reviews',
        targetEntityId: review.id,
        riskLevel: 'medium', // Summaries need human review
        expiresInHours: 336, // 2 weeks
      })

      if (proposalId) proposalsCreated++
    }
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: totalTokens,
    costUsd: totalCost,
    summary: `Processed ${cycles.length} review cycles. Created ${proposalsCreated} proposals (${proposalsAutoApproved} auto-approved).`,
    metadata: {
      cyclesProcessed: cycles.length,
      reminders: proposalsAutoApproved,
      summariesDrafted: proposalsCreated - proposalsAutoApproved,
    },
  }
}

export default handler
