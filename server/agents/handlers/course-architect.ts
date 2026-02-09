/**
 * Agent A4: Course Architect
 * 
 * Designs training courses, quizzes, and lesson plans for L1-L2 skill gaps.
 * Uses LLM to generate course content tailored to veterinary practice.
 * 
 * Reads: employee_skill_gaps, training_courses, skill_library
 * Writes: agent_proposals (course_draft type)
 * LLM: gpt-4o for rich course content generation
 */

import type { AgentRunContext, AgentRunResult, CourseDraftDetail } from '~/types/agent.types'
import { createProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any // New tables not yet in generated types

  logger.info(`[Agent:${agentId}] Starting course architect`, 'agent', { runId })

  // 1. Find skills with gaps at L1-L2 that don't have existing courses
  const { data: gaps, error: gapErr } = await supabase
    .from('employee_skill_gaps')
    .select('skill_id, skill_name, category, expected_level')
    .lte('expected_level', 3) // Focus on intro-level courses
    .gte('gap', 1)

  if (gapErr) {
    throw new Error(`Failed to fetch gaps: ${gapErr.message}`)
  }

  if (!gaps || gaps.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'No L1-L2 skill gaps found to create courses for.',
    }
  }

  // Get unique skills with gap counts
  const skillGapCounts = new Map<string, { skill_id: string; skill_name: string; category: string | null; count: number; max_level: number }>()
  for (const g of gaps) {
    const existing = skillGapCounts.get(g.skill_id)
    if (existing) {
      existing.count++
      existing.max_level = Math.max(existing.max_level, g.expected_level)
    } else {
      skillGapCounts.set(g.skill_id, {
        skill_id: g.skill_id,
        skill_name: g.skill_name,
        category: g.category,
        count: 1,
        max_level: g.expected_level,
      })
    }
  }

  // 2. Check which skills already have courses
  const { data: existingCourses } = await supabase
    .from('training_courses')
    .select('title, description')

  const courseTitles = new Set(
    (existingCourses ?? []).map(c => c.title.toLowerCase())
  )

  // 3. Sort by gap count (most needed first) and pick top candidates
  const candidates = Array.from(skillGapCounts.values())
    .sort((a, b) => b.count - a.count)
    .filter(c => {
      // Skip if a course with a similar name already exists
      const lower = c.skill_name.toLowerCase()
      for (const title of courseTitles) {
        if (title.includes(lower) || lower.includes(title)) return false
      }
      return true
    })
    .slice(0, 3) // Max 3 courses per run

  if (candidates.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'All gap skills already have courses or near-matching courses.',
    }
  }

  let totalTokens = 0
  let totalCost = 0
  let proposalsCreated = 0

  // 4. Generate a course for each candidate
  for (const candidate of candidates) {
    const systemPrompt = `You are an expert veterinary education designer. Create an online self-paced training course for veterinary practice employees learning "${candidate.skill_name}" (${candidate.category ?? 'General'}).

Target learners: Veterinary staff at levels 1-2 (beginner to competent). The course should take them from awareness to being able to perform basic tasks independently.

Create a complete course including:
1. Course title and description
2. 3-5 lessons with detailed content outlines
3. 5-10 quiz questions (multiple choice, with explanations)
4. Suggested external resources (videos, articles)
5. Estimated completion time

IMPORTANT: Make content specific to veterinary practice, not generic. Use real terminology and practical scenarios.

Respond in JSON:
{
  "title": "Course Title",
  "description": "Course description (2-3 sentences)",
  "estimated_hours": 2,
  "lessons": [
    {
      "title": "Lesson Title",
      "content_outline": "Detailed outline of what the lesson covers (200+ words)",
      "order": 1
    }
  ],
  "quiz_questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_indices": [0],
      "explanation": "Why this answer is correct"
    }
  ],
  "external_resources": [
    {
      "title": "Resource Title",
      "url": "https://example.com",
      "type": "video"
    }
  ]
}`

    try {
      const chatResult = await agentChat({
        agentId,
        runId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a course for "${candidate.skill_name}" (${candidate.category}). ${candidate.count} employees currently need this skill. Target level: up to ${candidate.max_level}.` },
        ],
        model: 'reasoning', // Use gpt-4o for high-quality content
        responseFormat: 'json',
        maxTokens: 4000,
        temperature: 0.5,
      })

      totalTokens += chatResult.tokensUsed
      totalCost += chatResult.costUsd

      // Parse course content
      let courseContent: Omit<CourseDraftDetail, 'skill_id' | 'skill_name' | 'target_level'>
      try {
        courseContent = JSON.parse(chatResult.content)
      } catch {
        logger.warn(`[Agent:${agentId}] Failed to parse course for "${candidate.skill_name}"`, 'agent')
        continue
      }

      // Build full detail
      const detail: CourseDraftDetail = {
        skill_id: candidate.skill_id,
        skill_name: candidate.skill_name,
        target_level: candidate.max_level,
        title: (courseContent as any).title ?? `Introduction to ${candidate.skill_name}`,
        description: (courseContent as any).description ?? '',
        estimated_hours: (courseContent as any).estimated_hours ?? 2,
        lessons: (courseContent as any).lessons ?? [],
        quiz_questions: (courseContent as any).quiz_questions ?? [],
        external_resources: (courseContent as any).external_resources ?? [],
      }

      // Create proposal (medium risk — course content should be reviewed)
      const proposalId = await createProposal({
        agentId,
        proposalType: 'course_draft',
        title: `Course: ${detail.title}`,
        summary: `${detail.lessons.length} lessons, ${detail.quiz_questions.length} quiz questions. Covers "${candidate.skill_name}" for ${candidate.count} employees.`,
        detail: detail as unknown as Record<string, unknown>,
        targetEntityType: 'training_courses',
        riskLevel: 'medium', // Courses should be reviewed before publishing
        expiresInHours: 672, // 4 weeks
      })

      if (proposalId) {
        proposalsCreated++
      }
    } catch (err) {
      logger.warn(`[Agent:${agentId}] Failed to generate course for "${candidate.skill_name}"`, 'agent', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    status: proposalsCreated > 0 ? 'success' : 'partial',
    proposalsCreated,
    proposalsAutoApproved: 0, // Courses always need human review
    tokensUsed: totalTokens,
    costUsd: totalCost,
    summary: `Generated ${proposalsCreated} course draft(s) for top skill gaps. Awaiting review.`,
    metadata: {
      candidatesEvaluated: candidates.length,
      coursesGenerated: proposalsCreated,
      totalTokens,
    },
  }
}

export default handler
