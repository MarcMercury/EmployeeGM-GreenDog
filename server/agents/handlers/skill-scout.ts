/**
 * Agent A1: Skill Scout
 * 
 * Discovers new veterinary industry skills via OpenAI and proposes additions
 * to the skill_library. Compares against existing skills to avoid duplicates.
 * 
 * Reads: skill_library (existing skills)
 * Writes: agent_proposals (new_skill type)
 * LLM: gpt-4o-mini for skill generation
 */

import type { AgentRunContext, AgentRunResult, NewSkillDetail } from '~/types/agent.types'
import { createProposal, autoApproveProposal, markProposalApplied } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

const SKILL_CATEGORIES = [
  'Clinical',
  'Diagnostics',
  'Surgical',
  'Emergency',
  'Pharmacy',
  'Client Communication',
  'Administrative',
  'HR & Leadership',
  'Training & Education',
  'Technology',
]

const TARGET_ROLES = [
  'Veterinarian',
  'Veterinary Technician',
  'Veterinary Assistant',
  'Client Service Representative (CSR)',
  'Shift Supervisor',
  'Practice Manager',
  'Office Administrator',
  'Kennel Attendant',
]

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any // New tables not yet in generated types

  logger.info(`[Agent:${agentId}] Starting skill scout`, 'agent', { runId })

  // 1. Load existing skills
  const { data: existingSkills, error: skillErr } = await supabase
    .from('skill_library')
    .select('id, name, category, description')

  if (skillErr) {
    throw new Error(`Failed to fetch skill library: ${skillErr.message}`)
  }

  const existingNames = new Set(
    (existingSkills ?? []).map(s => s.name.toLowerCase().trim())
  )

  const existingList = (existingSkills ?? [])
    .map(s => `- ${s.name} (${s.category})`)
    .join('\n')

  // 2. Determine focus area (rotate through categories)
  const focusIndex = (config.lastCategoryIndex as number ?? -1) + 1
  const focusCategory = SKILL_CATEGORIES[focusIndex % SKILL_CATEGORIES.length]

  // 3. Build prompt
  const systemPrompt = `You are a veterinary workforce development expert with deep knowledge of modern veterinary practices, industry standards from AVMA and NAVTA, and emerging trends in veterinary medicine.

Your task is to suggest NEW skills that should be tracked for veterinary practice employees. Focus on practical, measurable skills that can be assessed at levels 1-5.

EXISTING SKILLS (do NOT suggest duplicates or near-duplicates):
${existingList}

RULES:
- Suggest 8-15 genuinely NEW skills not in the existing list
- Focus primarily on the "${focusCategory}" category but include 2-3 from other categories
- Each skill must be specific and measurable (not vague like "good communication")
- Include skills relevant to modern veterinary practices (telemedicine, digital records, fear-free handling, etc.)
- Consider industry trends, certification requirements, and emerging best practices
- For each skill, identify which roles would typically need it

Respond in JSON format:
{
  "skills": [
    {
      "name": "Skill Name",
      "category": "Category",
      "description": "What this skill involves and why it matters",
      "typical_roles": ["Role1", "Role2"],
      "suggested_level_range": [1, 5],
      "source_reasoning": "Why this skill is relevant (cite trends, standards, etc.)"
    }
  ]
}`

  const userPrompt = `Suggest new veterinary practice skills with a focus on "${focusCategory}". Consider recent trends in veterinary medicine including Fear Free certification, telemedicine, advanced imaging, sustainability, and modern client communication. Target roles: ${TARGET_ROLES.join(', ')}.`

  // 4. Call LLM
  const chatResult = await agentChat({
    agentId,
    runId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'fast',
    responseFormat: 'json',
    maxTokens: 3000,
    temperature: 0.7,
  })

  // 5. Parse response
  let suggestedSkills: NewSkillDetail[] = []
  try {
    const parsed = JSON.parse(chatResult.content)
    suggestedSkills = (parsed.skills ?? []) as NewSkillDetail[]
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${chatResult.content.substring(0, 200)}`)
  }

  // 6. Deduplicate against existing skills
  const newSkills = suggestedSkills.filter(s => {
    const lower = s.name.toLowerCase().trim()
    // Check exact match
    if (existingNames.has(lower)) return false
    // Check close matches (starts with same 3+ words)
    const words = lower.split(' ').slice(0, 3).join(' ')
    for (const existing of existingNames) {
      if (existing.startsWith(words) || words.startsWith(existing.split(' ').slice(0, 3).join(' '))) {
        return false
      }
    }
    return true
  })

  logger.info(`[Agent:${agentId}] LLM suggested ${suggestedSkills.length} skills, ${newSkills.length} are genuinely new`, 'agent')

  // 7. Create proposals for each new skill
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  for (const skill of newSkills) {
    const proposalId = await createProposal({
      agentId,
      proposalType: 'new_skill',
      title: `New Skill: ${skill.name}`,
      summary: `${skill.category} skill for ${skill.typical_roles.join(', ')}. ${skill.description}`,
      detail: skill as unknown as Record<string, unknown>,
      targetEntityType: 'skill_library',
      riskLevel: 'low', // New skills are low risk — they just add to the library
      expiresInHours: 336, // 2 weeks
    })

    if (proposalId) {
      proposalsCreated++
      // Auto-approve well-structured skills with clear descriptions
      if (skill.description.length > 20 && skill.typical_roles.length > 0) {
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++

        // Actually insert into skill_library
        const { error: insertErr } = await supabase
          .from('skill_library')
          .insert({
            name: skill.name,
            category: skill.category,
            description: skill.description,
            source: 'agent',
            agent_proposal_id: proposalId,
          })

        if (insertErr) {
          logger.warn(`[Agent:${agentId}] Failed to insert skill "${skill.name}"`, 'agent', { error: insertErr.message })
        } else {
          await markProposalApplied(proposalId)
        }
      }
    }
  }

  // 8. Update config with category rotation
  await supabase
    .from('agent_registry')
    .update({
      config: { ...config, lastCategoryIndex: focusIndex },
    })
    .eq('agent_id', agentId)

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: chatResult.tokensUsed,
    costUsd: chatResult.costUsd,
    summary: `Discovered ${newSkills.length} new skills (focus: ${focusCategory}). ${proposalsAutoApproved} auto-approved and added to library.`,
    metadata: {
      focusCategory,
      suggestedCount: suggestedSkills.length,
      newCount: newSkills.length,
      duplicatesFiltered: suggestedSkills.length - newSkills.length,
    },
  }
}

export default handler
