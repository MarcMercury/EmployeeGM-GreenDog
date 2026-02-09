/**
 * Agent A5: Mentor Matchmaker
 * 
 * Pairs high-skill employees (L4-L5) with those who have skill gaps (L1-L3).
 * Pure SQL/logic — no LLM calls needed.
 * 
 * Reads: employee_skill_gaps, employee_skills, employees, mentorships (existing)
 * Writes: agent_proposals (mentor_match type)
 */

import type { AgentRunContext, AgentRunResult, MentorMatchDetail } from '~/types/agent.types'
import { createProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const MAX_MENTEES_PER_MENTOR = 3
const MIN_MENTOR_LEVEL = 4
const MIN_GAP_FOR_MENTORSHIP = 2 // Only match when gap >= 2 levels

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any // New tables not yet in generated types

  logger.info(`[Agent:${agentId}] Starting mentor matchmaking`, 'agent', { runId })

  // 1. Get skill gaps that qualify for mentorship (gap >= 2, current level >= 1)
  const { data: gaps, error: gapErr } = await supabase
    .from('employee_skill_gaps')
    .select('employee_id, skill_id, skill_name, current_level, expected_level, gap')
    .gte('gap', MIN_GAP_FOR_MENTORSHIP)
    .gte('current_level', 1) // Must have at least awareness
    .order('gap', { ascending: false })

  if (gapErr) {
    throw new Error(`Failed to fetch skill gaps: ${gapErr.message}`)
  }

  if (!gaps || gaps.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'No qualification gaps found for mentorship matching.',
    }
  }

  // 2. Get potential mentors (employees with level >= 4 in any skill)
  const { data: mentorSkills, error: msErr } = await supabase
    .from('employee_skills')
    .select('employee_id, skill_id, level')
    .gte('level', MIN_MENTOR_LEVEL)

  if (msErr) {
    throw new Error(`Failed to fetch mentor skills: ${msErr.message}`)
  }

  // Build mentor map: skill_id -> [{ employee_id, level }]
  const mentorsBySkill = new Map<string, Array<{ employee_id: string; level: number }>>()
  for (const ms of (mentorSkills ?? [])) {
    if (!mentorsBySkill.has(ms.skill_id)) mentorsBySkill.set(ms.skill_id, [])
    mentorsBySkill.get(ms.skill_id)!.push({ employee_id: ms.employee_id, level: ms.level })
  }

  // 3. Get existing active mentorships to avoid duplicate matches
  const { data: existingMentorships } = await supabase
    .from('mentorships')
    .select('mentor_employee_id, mentee_employee_id, skill_id, status')
    .in('status', ['pending', 'active'])

  const activeMentorshipSet = new Set(
    (existingMentorships ?? []).map(m => `${m.mentor_employee_id}:${m.mentee_employee_id}:${m.skill_id}`)
  )

  // Count current mentee load per mentor
  const mentorLoadMap = new Map<string, number>()
  for (const m of (existingMentorships ?? [])) {
    const current = mentorLoadMap.get(m.mentor_employee_id) ?? 0
    mentorLoadMap.set(m.mentor_employee_id, current + 1)
  }

  // 4. Get employee names for display
  const employeeIds = new Set<string>()
  for (const g of gaps) employeeIds.add(g.employee_id)
  for (const mentors of mentorsBySkill.values()) {
    for (const m of mentors) employeeIds.add(m.employee_id)
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, location_id')
    .in('id', Array.from(employeeIds))

  const empMap = new Map<string, { name: string; location_id: string | null }>()
  for (const e of (employees ?? [])) {
    empMap.set(e.id, { name: `${e.first_name} ${e.last_name}`, location_id: e.location_id })
  }

  // 5. Match mentees to mentors
  let proposalsCreated = 0
  const matchedPairs = new Set<string>() // prevent duplicate proposals in this run

  for (const gap of gaps) {
    const mentors = mentorsBySkill.get(gap.skill_id)
    if (!mentors || mentors.length === 0) continue

    // Score and rank mentors
    const scoredMentors = mentors
      .filter(m => {
        // Can't mentor yourself
        if (m.employee_id === gap.employee_id) return false
        // Already has this mentorship
        if (activeMentorshipSet.has(`${m.employee_id}:${gap.employee_id}:${gap.skill_id}`)) return false
        // Mentor at capacity
        if ((mentorLoadMap.get(m.employee_id) ?? 0) >= MAX_MENTEES_PER_MENTOR) return false
        return true
      })
      .map(m => {
        const menteeInfo = empMap.get(gap.employee_id)
        const mentorInfo = empMap.get(m.employee_id)
        let score = 0

        // Higher mentor level = better
        score += (m.level - MIN_MENTOR_LEVEL + 1) * 20

        // Same location = bonus
        if (menteeInfo?.location_id && mentorInfo?.location_id &&
            menteeInfo.location_id === mentorInfo.location_id) {
          score += 30
        }

        // Fewer existing mentees = bonus (more capacity)
        const load = mentorLoadMap.get(m.employee_id) ?? 0
        score += (MAX_MENTEES_PER_MENTOR - load) * 10

        return { ...m, score, mentorInfo, menteeInfo }
      })
      .sort((a, b) => b.score - a.score)

    // Take the best mentor
    const bestMentor = scoredMentors[0]
    if (!bestMentor) continue

    // Avoid proposing the same pair twice in this run
    const pairKey = `${bestMentor.employee_id}:${gap.employee_id}:${gap.skill_id}`
    if (matchedPairs.has(pairKey)) continue
    matchedPairs.add(pairKey)

    const detail: MentorMatchDetail = {
      mentee_employee_id: gap.employee_id,
      mentee_name: empMap.get(gap.employee_id)?.name ?? 'Unknown',
      mentor_employee_id: bestMentor.employee_id,
      mentor_name: empMap.get(bestMentor.employee_id)?.name ?? 'Unknown',
      skill_id: gap.skill_id,
      skill_name: gap.skill_name,
      mentee_level: gap.current_level,
      mentor_level: bestMentor.level,
      match_score: bestMentor.score,
      reasoning: `${empMap.get(bestMentor.employee_id)?.name} is Level ${bestMentor.level} in ${gap.skill_name} and can help ${empMap.get(gap.employee_id)?.name} grow from Level ${gap.current_level} to ${gap.expected_level}.`,
    }

    const proposalId = await createProposal({
      agentId,
      proposalType: 'mentor_match',
      title: `Mentor Match: ${detail.mentor_name} → ${detail.mentee_name} (${gap.skill_name})`,
      summary: detail.reasoning,
      detail: detail as unknown as Record<string, unknown>,
      targetEmployeeId: gap.employee_id,
      targetEntityType: 'mentorships',
      riskLevel: 'medium', // Requires human review since it involves two people
      expiresInHours: 336, // 2 weeks
    })

    if (proposalId) {
      proposalsCreated++
      // Update mentor load tracking for this run
      const load = mentorLoadMap.get(bestMentor.employee_id) ?? 0
      mentorLoadMap.set(bestMentor.employee_id, load + 1)
    }

    // Cap at 20 proposals per run to avoid spam
    if (proposalsCreated >= 20) break
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved: 0, // Mentor matches always need human review
    tokensUsed: 0,
    costUsd: 0,
    summary: `Created ${proposalsCreated} mentor match proposals from ${gaps.length} skill gaps.`,
    metadata: {
      totalGapsChecked: gaps.length,
      availableMentorSkills: mentorsBySkill.size,
      proposalsCreated,
    },
  }
}

export default handler
