/**
 * Agent C3: Engagement Pulse
 *
 * Detects employee disengagement by computing weekly engagement scores
 * based on login frequency, skill/course activity, goal updates, and mentorship.
 * Pure SQL/logic — no LLM calls needed.
 *
 * CA vet industry context (from ~/utils/vetBenchmarks.ts):
 * - Staffing challenges are acute in CA due to high cost of living
 * - Staff-to-vet ratio of 4:1 to 5:1 is optimal — losing staff impacts throughput
 * - Disengagement is an early indicator of turnover, which is particularly costly
 *   in CA's tight veterinary labor market
 *
 * Reads: profiles (login), employee_skills, training_progress, training_quiz_attempts,
 *        goal_updates, employee_goals, mentorships, employee_achievements
 * Writes: agent_proposals (engagement_alert type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const DECLINE_THRESHOLD = 20 // >20% drop week-over-week triggers alert
const LOW_SCORE_THRESHOLD = 20 // Absolute low threshold

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting engagement pulse`, 'agent', { runId })

  // Date windows
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const oneWeekStr = oneWeekAgo.toISOString()
  const twoWeekStr = twoWeeksAgo.toISOString()
  const nowStr = now.toISOString()

  // 1. Get active employees with their profiles
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, profile_id, manager_employee_id')
    .eq('employment_status', 'active')

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  const profileToEmp = new Map<string, any>()
  const empMap = new Map<string, any>()
  for (const emp of employees) {
    empMap.set(emp.id, emp)
    if (emp.profile_id) profileToEmp.set(emp.profile_id, emp)
  }

  // 2. Gather activity data — current week vs previous week
  const empIds = employees.map((e: any) => e.id)
  const profileIds = employees.map((e: any) => e.profile_id).filter(Boolean)

  // Login activity (from profiles.last_login_at)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, last_login_at')
    .in('id', profileIds)

  // Training progress — this week
  const { data: progressThisWeek } = await supabase
    .from('training_progress')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('completed_at', oneWeekStr)
    .lte('completed_at', nowStr)

  // Training progress — last week
  const { data: progressLastWeek } = await supabase
    .from('training_progress')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('completed_at', twoWeekStr)
    .lt('completed_at', oneWeekStr)

  // Quiz attempts — this week
  const { data: quizzesThisWeek } = await supabase
    .from('training_quiz_attempts')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('created_at', oneWeekStr)

  // Quiz attempts — last week
  const { data: quizzesLastWeek } = await supabase
    .from('training_quiz_attempts')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('created_at', twoWeekStr)
    .lt('created_at', oneWeekStr)

  // Goal updates — this week
  const { data: goalUpdatesThisWeek } = await supabase
    .from('goal_updates')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('created_at', oneWeekStr)

  const { data: goalUpdatesLastWeek } = await supabase
    .from('goal_updates')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('created_at', twoWeekStr)
    .lt('created_at', oneWeekStr)

  // Achievements — this week
  const { data: achievementsThisWeek } = await supabase
    .from('employee_achievements')
    .select('employee_id')
    .in('employee_id', empIds)
    .gte('earned_at', oneWeekStr)

  // 3. Compute engagement scores
  function countActivity(data: any[] | null, empId: string): number {
    return (data ?? []).filter((d: any) => d.employee_id === empId).length
  }

  const scores: Array<{
    employee_id: string
    name: string
    manager_id: string | null
    score_this_week: number
    score_last_week: number
    decline_pct: number
    details: Record<string, number>
  }> = []

  for (const emp of employees) {
    // Check login recency
    const profile = profiles?.find((p: any) => p.id === emp.profile_id)
    const lastLogin = profile?.last_login_at ? new Date(profile.last_login_at) : null
    const loggedInThisWeek = lastLogin && lastLogin >= oneWeekAgo ? 1 : 0
    const loggedInLastWeek = lastLogin && lastLogin >= twoWeeksAgo && lastLogin < oneWeekAgo ? 1 : 0

    // Activity counts
    const thisWeek = {
      login: loggedInThisWeek,
      training: countActivity(progressThisWeek, emp.id),
      quizzes: countActivity(quizzesThisWeek, emp.id),
      goals: countActivity(goalUpdatesThisWeek, emp.id),
      achievements: countActivity(achievementsThisWeek, emp.id),
    }

    const lastWeekAct = {
      login: loggedInLastWeek,
      training: countActivity(progressLastWeek, emp.id),
      quizzes: countActivity(quizzesLastWeek, emp.id),
      goals: countActivity(goalUpdatesLastWeek, emp.id),
    }

    // Score = weighted sum (max ~100)
    // Login: 30 points, Training: 25, Quizzes: 20, Goals: 15, Achievements: 10
    const scoreThisWeek = Math.min(100,
      thisWeek.login * 30 +
      Math.min(thisWeek.training, 5) * 5 +
      Math.min(thisWeek.quizzes, 4) * 5 +
      Math.min(thisWeek.goals, 3) * 5 +
      thisWeek.achievements * 10
    )

    const scoreLastWeek = Math.min(100,
      lastWeekAct.login * 30 +
      Math.min(lastWeekAct.training, 5) * 5 +
      Math.min(lastWeekAct.quizzes, 4) * 5 +
      Math.min(lastWeekAct.goals, 3) * 5
    )

    const declinePct = scoreLastWeek > 0
      ? Math.round(((scoreLastWeek - scoreThisWeek) / scoreLastWeek) * 100)
      : (scoreThisWeek === 0 ? 100 : 0)

    scores.push({
      employee_id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      manager_id: emp.manager_employee_id,
      score_this_week: scoreThisWeek,
      score_last_week: scoreLastWeek,
      decline_pct: declinePct,
      details: thisWeek,
    })
  }

  // 4. Identify declining/disengaged employees
  const flagged = scores.filter(s =>
    s.decline_pct > DECLINE_THRESHOLD || s.score_this_week < LOW_SCORE_THRESHOLD
  )

  // 5. Check for recent alerts to avoid spam
  const weekAgoStr = oneWeekAgo.toISOString()
  const { data: recentAlerts } = await supabase
    .from('agent_proposals')
    .select('target_employee_id')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'engagement_alert')
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', weekAgoStr)

  const recentlyAlerted = new Set(
    (recentAlerts ?? []).map((p: any) => p.target_employee_id)
  )

  // 6. Create proposals
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  for (const emp of flagged) {
    if (recentlyAlerted.has(emp.employee_id)) continue

    const isLow = emp.score_this_week < LOW_SCORE_THRESHOLD
    const isDeclining = emp.decline_pct > DECLINE_THRESHOLD

    const proposalId = await createProposal({
      agentId,
      proposalType: 'engagement_alert',
      title: `${isLow ? '🔴' : '🟡'} Engagement: ${emp.name} (${emp.score_this_week}/100)`,
      summary: isDeclining
        ? `Engagement dropped ${emp.decline_pct}% (${emp.score_last_week}→${emp.score_this_week}).`
        : `Low engagement score: ${emp.score_this_week}/100.`,
      detail: {
        employee_id: emp.employee_id,
        employee_name: emp.name,
        manager_employee_id: emp.manager_id,
        score_this_week: emp.score_this_week,
        score_last_week: emp.score_last_week,
        decline_percent: emp.decline_pct,
        activity_breakdown: emp.details,
        suggested_actions: getSuggestedActions(emp),
      },
      targetEmployeeId: emp.employee_id,
      targetEntityType: 'employees',
      riskLevel: isLow ? 'medium' : 'low',
      expiresInHours: 168,
    })

    if (proposalId) {
      proposalsCreated++
      if (!isLow) {
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }
  }

  // 7. Weekly summary
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score_this_week, 0) / scores.length)
    : 0

  const summaryId = await createProposal({
    agentId,
    proposalType: 'engagement_report',
    title: `Weekly Engagement Pulse — ${new Date().toLocaleDateString()}`,
    summary: `Avg engagement: ${avgScore}/100. ${flagged.length} employees flagged.`,
    detail: {
      total_employees: scores.length,
      average_score: avgScore,
      flagged_count: flagged.length,
      declining_count: scores.filter(s => s.decline_pct > DECLINE_THRESHOLD).length,
      low_score_count: scores.filter(s => s.score_this_week < LOW_SCORE_THRESHOLD).length,
      score_distribution: {
        high: scores.filter(s => s.score_this_week >= 70).length,
        medium: scores.filter(s => s.score_this_week >= 30 && s.score_this_week < 70).length,
        low: scores.filter(s => s.score_this_week < 30).length,
      },
      top_engaged: scores
        .sort((a, b) => b.score_this_week - a.score_this_week)
        .slice(0, 5)
        .map(s => ({ name: s.name, score: s.score_this_week })),
      most_at_risk: flagged
        .sort((a, b) => a.score_this_week - b.score_this_week)
        .slice(0, 10)
        .map(s => ({ name: s.name, score: s.score_this_week, decline: s.decline_pct })),
    },
    riskLevel: 'low',
    expiresInHours: 168,
  })

  if (summaryId) {
    await autoApproveProposal(summaryId)
    proposalsCreated++
    proposalsAutoApproved++
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Pulse checked ${scores.length} employees. Avg: ${avgScore}/100. Flagged: ${flagged.length}.`,
    metadata: {
      employeesChecked: scores.length,
      averageScore: avgScore,
      flaggedCount: flagged.length,
    },
  }
}

function getSuggestedActions(emp: {
  score_this_week: number
  details: Record<string, number>
  decline_pct: number
}): string[] {
  const actions: string[] = []

  if (emp.details.login === 0) {
    actions.push('Employee has not logged in this week — consider a check-in')
  }
  if (emp.details.training === 0) {
    actions.push('No training activity — assign a course or suggest skill development')
  }
  if (emp.details.goals === 0) {
    actions.push('No goal updates — schedule a 1:1 to review goals')
  }
  if (emp.decline_pct > 40) {
    actions.push('Significant engagement drop — recommend manager conversation')
  }
  if (actions.length === 0) {
    actions.push('Monitor — engagement slightly below threshold')
  }

  return actions
}

export default handler
