/**
 * Agent A3: Gap Analyzer
 * 
 * Compares every employee's current skills against their role's expectations.
 * Pure SQL/logic — no LLM calls needed.
 * 
 * Reads: employees + employee_skills + role_skill_expectations + skill_library
 * Writes: employee_skill_gaps (full recompute)
 * Triggers: downstream agents (Course Architect, Mentor Matchmaker, Personal Coach)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any // New tables not yet in generated types

  logger.info(`[Agent:${agentId}] Starting gap analysis`, 'agent', { runId })

  // 1. Get all active employees with their job positions
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, position_id, department_id')
    .eq('employment_status', 'active')

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  // 2. Get all role-skill expectations
  const { data: expectations, error: expErr } = await supabase
    .from('role_skill_expectations')
    .select('job_position_id, skill_id, expected_level, importance')

  if (expErr) {
    throw new Error(`Failed to fetch expectations: ${expErr?.message}`)
  }

  if (!expectations || expectations.length === 0) {
    logger.info(`[Agent:${agentId}] No role-skill expectations found — nothing to analyze`, 'agent')
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'No role-skill expectations configured yet. Run Role Mapper first.',
    }
  }

  // 3. Get all employee skills
  const { data: empSkills, error: esErr } = await supabase
    .from('employee_skills')
    .select('employee_id, skill_id, level')

  if (esErr) {
    throw new Error(`Failed to fetch employee skills: ${esErr?.message}`)
  }

  // 4. Get skill library for names/categories
  const { data: skillLib, error: slErr } = await supabase
    .from('skill_library')
    .select('id, name, category')

  if (slErr) {
    throw new Error(`Failed to fetch skill library: ${slErr?.message}`)
  }

  // Build lookup maps
  const skillMap = new Map<string, { name: string; category: string | null }>()
  for (const skill of (skillLib ?? [])) {
    skillMap.set(skill.id, { name: skill.name, category: skill.category })
  }

  const empSkillMap = new Map<string, Map<string, number>>() // employee_id -> skill_id -> level
  for (const es of (empSkills ?? [])) {
    if (!empSkillMap.has(es.employee_id)) empSkillMap.set(es.employee_id, new Map())
    empSkillMap.get(es.employee_id)!.set(es.skill_id, es.level)
  }

  const expectationsByPosition = new Map<string, typeof expectations>()
  for (const exp of expectations) {
    if (!expectationsByPosition.has(exp.job_position_id)) {
      expectationsByPosition.set(exp.job_position_id, [])
    }
    expectationsByPosition.get(exp.job_position_id)!.push(exp)
  }

  // 5. Check for available courses and mentors
  const { data: courses } = await supabase
    .from('training_courses')
    .select('id, skill_library_id:metadata->skill_id')
    .not('metadata->skill_id', 'is', null)
  
  const courseSkillIds = new Set<string>()
  // Also check courses that have skill associations
  const { data: courseLinks } = await supabase
    .from('training_courses')
    .select('id')
  // For simplicity, we'll mark has_course_available based on actual enrollment availability later

  const { data: mentors } = await supabase
    .from('employee_skills')
    .select('skill_id')
    .gte('level', 4)
  
  const mentorSkillIds = new Set<string>()
  for (const m of (mentors ?? [])) {
    mentorSkillIds.add(m.skill_id)
  }

  // 6. Compute gaps for every employee
  const gaps: Array<{
    employee_id: string
    skill_id: string
    skill_name: string
    category: string | null
    current_level: number
    expected_level: number
    gap: number
    importance: string
    has_course_available: boolean
    has_mentor_available: boolean
  }> = []

  let employeesAnalyzed = 0
  let totalGaps = 0

  for (const emp of employees) {
    if (!emp.position_id) continue
    
    const posExpectations = expectationsByPosition.get(emp.position_id)
    if (!posExpectations) continue

    employeesAnalyzed++
    const empSkillLevels = empSkillMap.get(emp.id) ?? new Map()

    for (const exp of posExpectations) {
      const currentLevel = empSkillLevels.get(exp.skill_id) ?? 0
      const gap = exp.expected_level - currentLevel

      if (gap > 0) {
        totalGaps++
        const skillInfo = skillMap.get(exp.skill_id)
        gaps.push({
          employee_id: emp.id,
          skill_id: exp.skill_id,
          skill_name: skillInfo?.name ?? 'Unknown',
          category: skillInfo?.category ?? null,
          current_level: currentLevel,
          expected_level: exp.expected_level,
          gap,
          importance: exp.importance,
          has_course_available: courseSkillIds.has(exp.skill_id),
          has_mentor_available: mentorSkillIds.has(exp.skill_id),
        })
      }
    }
  }

  // 7. Clear and rewrite employee_skill_gaps
  const { error: deleteErr } = await supabase
    .from('employee_skill_gaps')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all with a valid filter

  if (deleteErr) {
    logger.warn(`[Agent:${agentId}] Failed to clear old gaps`, 'agent', { error: deleteErr.message })
  }

  // Insert in batches of 100
  let inserted = 0
  const batchSize = 100
  for (let i = 0; i < gaps.length; i += batchSize) {
    const batch = gaps.slice(i, i + batchSize).map(g => ({
      ...g,
      computed_at: new Date().toISOString(),
    }))

    const { error: insertErr } = await supabase
      .from('employee_skill_gaps')
      .insert(batch)

    if (insertErr) {
      logger.warn(`[Agent:${agentId}] Batch insert failed`, 'agent', { error: insertErr.message, batch: i })
    } else {
      inserted += batch.length
    }
  }

  // 8. Create a summary proposal for visibility
  const proposalId = await createProposal({
    agentId,
    proposalType: 'skill_gap_report',
    title: `Skill Gap Analysis — ${new Date().toLocaleDateString()}`,
    summary: `Analyzed ${employeesAnalyzed} employees, found ${totalGaps} skill gaps across ${new Set(gaps.map(g => g.skill_id)).size} skills.`,
    detail: {
      employees_analyzed: employeesAnalyzed,
      total_gaps: totalGaps,
      unique_skills_with_gaps: new Set(gaps.map(g => g.skill_id)).size,
      critical_gaps: gaps.filter(g => g.importance === 'required' && g.gap >= 3).length,
      top_gap_skills: getTopGapSkills(gaps),
    },
    riskLevel: 'low',
    expiresInHours: 168, // 1 week
  })

  // Auto-approve the report (it's informational)
  if (proposalId) {
    await autoApproveProposal(proposalId)
  }

  return {
    status: 'success',
    proposalsCreated: proposalId ? 1 : 0,
    proposalsAutoApproved: proposalId ? 1 : 0,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Analyzed ${employeesAnalyzed} employees. Found ${totalGaps} gaps. Inserted ${inserted} gap records.`,
    metadata: {
      employeesAnalyzed,
      totalGaps,
      inserted,
    },
  }
}

/** Get the top 10 skills with most gaps across employees */
function getTopGapSkills(gaps: Array<{ skill_name: string; gap: number }>): Array<{ skill: string; count: number; avgGap: number }> {
  const skillCounts = new Map<string, { count: number; totalGap: number }>()

  for (const g of gaps) {
    const existing = skillCounts.get(g.skill_name) ?? { count: 0, totalGap: 0 }
    existing.count++
    existing.totalGap += g.gap
    skillCounts.set(g.skill_name, existing)
  }

  return Array.from(skillCounts.entries())
    .map(([skill, data]) => ({
      skill,
      count: data.count,
      avgGap: Math.round((data.totalGap / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export default handler
