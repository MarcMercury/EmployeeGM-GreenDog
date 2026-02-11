/**
 * Agent C1: Personal Coach
 *
 * Generates daily personalized nudges for each employee based on their
 * goals, skill gaps, quiz progress, achievements, and attendance.
 * Uses LLM to craft motivational 2-3 sentence messages.
 *
 * Reads: employees, employee_goals, employee_skill_gaps, training_enrollments,
 *        training_progress, achievements, employee_achievements, attendance
 * Writes: agent_proposals (nudge type), notifications (on auto-approve)
 * LLM: gpt-4o-mini for message generation
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

const MAX_EMPLOYEES_PER_RUN = 20 // Process in batches to manage tokens

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting personal coach`, 'agent', { runId })

  // 1. Get active employees (batch with offset rotation)
  const lastOffset = (config.lastEmployeeOffset as number) ?? 0

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, position_id, profile_id')
    .eq('employment_status', 'active')
    .order('id')
    .range(lastOffset, lastOffset + MAX_EMPLOYEES_PER_RUN - 1)

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  // If we got fewer than max, reset offset for next run
  const nextOffset = employees.length < MAX_EMPLOYEES_PER_RUN ? 0 : lastOffset + MAX_EMPLOYEES_PER_RUN

  // 2. Gather context for all employees in this batch
  const empIds = employees.map((e: any) => e.id)
  const profileIds = employees.map((e: any) => e.profile_id).filter(Boolean)

  // Goals
  const { data: goals } = await supabase
    .from('employee_goals')
    .select('employee_id, title, category, progress, completed, target_date')
    .in('employee_id', empIds)
    .eq('completed', false)

  // Skill gaps (top 3 per employee)
  const { data: gaps } = await supabase
    .from('employee_skill_gaps')
    .select('employee_id, skill_name, current_level, expected_level, gap')
    .in('employee_id', empIds)
    .order('gap', { ascending: false })

  // Recent training progress
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProgress } = await supabase
    .from('training_progress')
    .select('employee_id, progress_percent, completed_at')
    .in('employee_id', empIds)
    .gte('completed_at', sevenDaysAgo)

  // Active enrollments
  const { data: enrollments } = await supabase
    .from('training_enrollments')
    .select('employee_id, status, due_date')
    .in('employee_id', empIds)
    .in('status', ['enrolled', 'in_progress'])

  // Recent achievements
  const { data: recentAchievements } = await supabase
    .from('employee_achievements')
    .select('employee_id, achievement_id, earned_at')
    .in('employee_id', empIds)
    .gte('earned_at', sevenDaysAgo)

  // All achievements for "close to unlocking" logic
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('id, name, description, category, points')

  const achievementMap = new Map<string, any>()
  for (const a of (allAchievements ?? [])) {
    achievementMap.set(a.id, a)
  }

  // Attendance (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: attendance } = await supabase
    .from('attendance')
    .select('employee_id, status')
    .in('employee_id', empIds)
    .gte('shift_date', thirtyDaysAgo)

  // 3. Avoid duplicate nudges (1 per employee per day)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { data: todayNudges } = await supabase
    .from('agent_proposals')
    .select('target_employee_id')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'nudge')
    .gte('created_at', todayStart.toISOString())

  const alreadyNudged = new Set(
    (todayNudges ?? []).map((p: any) => p.target_employee_id)
  )

  // 4. Build context per employee and generate nudges
  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  let totalTokens = 0
  let totalCost = 0

  const employeesToNudge = employees.filter((e: any) => !alreadyNudged.has(e.id))

  if (employeesToNudge.length === 0) {
    await supabase
      .from('agent_registry')
      .update({ config: { ...config, lastEmployeeOffset: nextOffset } })
      .eq('agent_id', agentId)

    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: `All ${employees.length} employees already nudged today.`,
    }
  }

  // Build context strings for batch LLM call
  const contextBlocks = employeesToNudge.map((emp: any) => {
    const empGoals = (goals ?? []).filter((g: any) => g.employee_id === emp.id)
    const empGaps = (gaps ?? []).filter((g: any) => g.employee_id === emp.id).slice(0, 3)
    const empProgress = (recentProgress ?? []).filter((p: any) => p.employee_id === emp.id)
    const empEnrollments = (enrollments ?? []).filter((e: any) => e.employee_id === emp.id)
    const empAchievements = (recentAchievements ?? []).filter((a: any) => a.employee_id === emp.id)
    const empAttendance = (attendance ?? []).filter((a: any) => a.employee_id === emp.id)

    const onTimeRate = empAttendance.length > 0
      ? Math.round((empAttendance.filter((a: any) => a.status === 'present').length / empAttendance.length) * 100)
      : null

    return {
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      context: [
        empGoals.length > 0 ? `Goals: ${empGoals.map((g: any) => `${g.title} (${g.progress}%)`).join(', ')}` : 'No active goals',
        empGaps.length > 0 ? `Skill gaps: ${empGaps.map((g: any) => `${g.skill_name} (L${g.current_level}→L${g.expected_level})`).join(', ')}` : 'No skill gaps',
        empProgress.length > 0 ? `Completed ${empProgress.length} training lessons this week` : 'No training activity this week',
        empEnrollments.length > 0 ? `${empEnrollments.length} active course enrollments` : '',
        empAchievements.length > 0 ? `Earned ${empAchievements.length} new achievements recently!` : '',
        onTimeRate !== null ? `Attendance: ${onTimeRate}% on-time rate (30 days)` : '',
      ].filter(Boolean).join('. '),
    }
  })

  // 5. Single batched LLM call for all employees
  const batchPrompt = contextBlocks.map((b: any) =>
    `EMPLOYEE: ${b.name}\nCONTEXT: ${b.context}`
  ).join('\n\n---\n\n')

  const chatResult = await agentChat({
    agentId,
    runId,
    messages: [
      {
        role: 'system',
        content: `You are a supportive veterinary workforce coach. For each employee below, generate a brief personalized nudge (2-3 sentences). Be specific, motivational, and actionable. Reference their actual data. Use a friendly but professional tone with an occasional emoji.

Rules:
- If they have good attendance, acknowledge it
- If they have skill gaps, suggest a course or mentor
- If they're close to completing a goal, encourage them
- If they recently earned an achievement, congratulate them
- If they have no activity, gently encourage engagement

Respond in JSON format:
{
  "nudges": [
    { "employee_name": "Name", "message": "Your personalized nudge..." }
  ]
}`,
      },
      { role: 'user', content: batchPrompt },
    ],
    model: 'fast',
    responseFormat: 'json',
    maxTokens: 2000,
    temperature: 0.7,
  })

  totalTokens += chatResult.tokensUsed
  totalCost += chatResult.costUsd

  // 6. Parse and create proposals
  let nudges: Array<{ employee_name: string; message: string }> = []
  try {
    const parsed = JSON.parse(chatResult.content)
    nudges = parsed.nudges ?? []
  } catch {
    logger.warn(`[Agent:${agentId}] Failed to parse nudge response`, 'agent')
  }

  for (const block of contextBlocks) {
    const nudge = nudges.find((n: any) => n.employee_name === block.name)
    if (!nudge) continue

    const proposalId = await createProposal({
      agentId,
      proposalType: 'nudge',
      title: `Daily Nudge: ${block.name}`,
      summary: nudge.message,
      detail: {
        employee_id: block.id,
        employee_name: block.name,
        message: nudge.message,
        context_used: block.context,
      },
      targetEmployeeId: block.id,
      targetEntityType: 'notifications',
      riskLevel: 'low',
      expiresInHours: 24, // Nudges expire quickly
    })

    if (proposalId) {
      proposalsCreated++
      await autoApproveProposal(proposalId)
      proposalsAutoApproved++

      // Deliver notification to employee's profile
      const emp = employeesToNudge.find((e: any) => e.id === block.id)
      if (emp?.profile_id) {
        await supabase.from('notifications').insert({
          profile_id: emp.profile_id,
          type: 'coach_nudge',
          category: 'training',
          title: '💡 Daily Coaching Tip',
          body: nudge.message,
          data: { agent_id: agentId, proposal_id: proposalId, url: '/development', action_label: 'View Tips' },
          is_read: false,
        })
      }
    }
  }

  // 7. Update offset
  await supabase
    .from('agent_registry')
    .update({ config: { ...config, lastEmployeeOffset: nextOffset } })
    .eq('agent_id', agentId)

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: totalTokens,
    costUsd: totalCost,
    summary: `Coached ${proposalsCreated}/${employeesToNudge.length} employees. Batch ${lastOffset}-${lastOffset + employees.length}.`,
    metadata: {
      batchSize: employees.length,
      nudgeSent: proposalsCreated,
      offset: lastOffset,
      nextOffset,
    },
  }
}

export default handler
