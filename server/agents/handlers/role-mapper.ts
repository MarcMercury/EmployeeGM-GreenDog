/**
 * Agent A2: Role Mapper
 * 
 * Maps skills to positions/roles with recommended proficiency levels.
 * Uses LLM to determine which skills from skill_library should be expected
 * for each job_position, and at what level.
 * 
 * Reads: job_positions, skill_library, role_skill_expectations (existing)
 * Writes: agent_proposals (skill_role_mapping type)
 * LLM: gpt-4o-mini for mapping logic
 */

import type { AgentRunContext, AgentRunResult, SkillRoleMappingDetail } from '~/types/agent.types'
import type { SkillImportance } from '~/types/agent.types'
import { createProposal, autoApproveProposal, markProposalApplied } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any // New tables not yet in generated types

  logger.info(`[Agent:${agentId}] Starting role mapping`, 'agent', { runId })

  // 1. Fetch all job positions
  const { data: positions, error: posErr } = await supabase
    .from('job_positions')
    .select('id, title, department_id')

  if (posErr || !positions || positions.length === 0) {
    throw new Error(`Failed to fetch positions: ${posErr?.message ?? 'No positions found'}`)
  }

  // 2. Fetch all skills
  const { data: skills, error: skillErr } = await supabase
    .from('skill_library')
    .select('id, name, category, description')

  if (skillErr || !skills) {
    throw new Error(`Failed to fetch skills: ${skillErr?.message}`)
  }

  // 3. Fetch existing mappings to avoid redundant proposals
  const { data: existingMappings } = await supabase
    .from('role_skill_expectations')
    .select('job_position_id, skill_id')

  const existingSet = new Set(
    (existingMappings ?? []).map((m: any) => `${m.job_position_id}:${m.skill_id}`)
  )

  // 4. Process one position at a time (rotate based on config)
  const lastIndex = (config.lastPositionIndex as number) ?? -1
  const positionIndex = (lastIndex + 1) % positions.length
  const position = positions[positionIndex]

  logger.info(`[Agent:${agentId}] Mapping skills for position: ${position.title}`, 'agent')

  // Build skills list for the prompt
  const skillsList = skills.map((s: any) => `- [${s.id}] ${s.name} (${s.category}): ${s.description ?? ''}`).join('\n')

  // 5. Build prompt
  const systemPrompt = `You are a veterinary practice HR expert. Your task is to map skills to job positions.

For the position "${position.title}", determine which skills from the library should be expected and at what proficiency level (1-5):
- Level 1: Awareness — knows the concept exists
- Level 2: Beginner — can perform with guidance
- Level 3: Competent — can perform independently 
- Level 4: Proficient — can teach others and handle complex cases
- Level 5: Expert — recognized authority, develops new approaches

Also classify each skill's importance:
- "required" — must have for the role
- "recommended" — should develop within 6-12 months
- "optional" — nice to have, enhances performance

SKILL LIBRARY:
${skillsList}

Select 15-30 relevant skills for this position. Skip skills that clearly don't apply.

Respond in JSON:
{
  "mappings": [
    {
      "skill_id": "uuid",
      "skill_name": "Skill Name",
      "expected_level": 3,
      "importance": "required",
      "reasoning": "Brief explanation of why this level"
    }
  ]
}`

  // 6. Call LLM
  const chatResult = await agentChat({
    agentId,
    runId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Map skills for the "${position.title}" position at a multi-location veterinary practice.` },
    ],
    model: 'fast',
    responseFormat: 'json',
    maxTokens: 3000,
    temperature: 0.3,
  })

  // 7. Parse response
  let mappings: Array<{
    skill_id: string
    skill_name: string
    expected_level: number
    importance: SkillImportance
    reasoning: string
  }> = []

  try {
    const parsed = JSON.parse(chatResult.content)
    mappings = parsed.mappings ?? []
  } catch {
    throw new Error(`Failed to parse LLM response: ${chatResult.content.substring(0, 200)}`)
  }

  // 8. Validate: only keep mappings for real skill IDs, skip existing
  const validSkillIds = new Set(skills.map((s: any) => s.id))
  const newMappings = mappings.filter(m => {
    if (!validSkillIds.has(m.skill_id)) return false
    if (existingSet.has(`${position.id}:${m.skill_id}`)) return false
    if (m.expected_level < 1 || m.expected_level > 5) return false
    return true
  })

  logger.info(`[Agent:${agentId}] LLM suggested ${mappings.length} mappings, ${newMappings.length} are new/valid`, 'agent')

  // 9. Create a single proposal for the entire position mapping
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  if (newMappings.length > 0) {
    const detail: SkillRoleMappingDetail = {
      job_position_id: position.id,
      job_position_name: position.title,
      mappings: newMappings,
    }

    const proposalId = await createProposal({
      agentId,
      proposalType: 'skill_role_mapping',
      title: `Skill Mapping: ${position.title} (${newMappings.length} skills)`,
      summary: `Maps ${newMappings.length} skills to "${position.title}" position. ${newMappings.filter(m => m.importance === 'required').length} required, ${newMappings.filter(m => m.importance === 'recommended').length} recommended.`,
      detail: detail as unknown as Record<string, unknown>,
      targetEntityType: 'role_skill_expectations',
      riskLevel: 'low',
      expiresInHours: 336, // 2 weeks
    })

    if (proposalId) {
      proposalsCreated++

      // Auto-approve and apply the mapping
      await autoApproveProposal(proposalId)
      proposalsAutoApproved++

      // Insert into role_skill_expectations
      const rows = newMappings.map(m => ({
        job_position_id: position.id,
        skill_id: m.skill_id,
        expected_level: m.expected_level,
        importance: m.importance,
        source: 'agent' as const,
        agent_proposal_id: proposalId,
        notes: m.reasoning,
      }))

      const { error: insertErr } = await supabase
        .from('role_skill_expectations')
        .insert(rows)

      if (insertErr) {
        logger.warn(`[Agent:${agentId}] Failed to insert role mappings`, 'agent', { error: insertErr.message })
      } else {
        await markProposalApplied(proposalId)
      }
    }
  }

  // 10. Update rotation config
  await supabase
    .from('agent_registry')
    .update({
      config: { ...config, lastPositionIndex: positionIndex },
    })
    .eq('agent_id', agentId)

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: chatResult.tokensUsed,
    costUsd: chatResult.costUsd,
    summary: `Mapped ${newMappings.length} skills to "${position.title}". Next position: ${positions[(positionIndex + 1) % positions.length]?.title}.`,
    metadata: {
      positionId: position.id,
      positionTitle: position.title,
      suggestedMappings: mappings.length,
      newMappings: newMappings.length,
      nextPosition: positions[(positionIndex + 1) % positions.length]?.title,
    },
  }
}

export default handler
