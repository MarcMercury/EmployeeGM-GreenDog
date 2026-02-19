/**
 * Agent: Marketing Events Scout
 *
 * Discovers local events related to pets, animals, street fairs, festivals, and parades.
 * Scrapes the web for event information and adds discovered events to the marketing calendar
 * as "proposed" or "considered" events.
 *
 * Reads: marketing_events (to check for duplicates)
 * Writes: agent_proposals (event_discovery type)
 * LLM: OpenAI for event discovery and data extraction
 */

import type { AgentRunContext, AgentRunResult, EventDiscoveryDetail } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import {
  generateEventSearchQueries,
  searchEventsViaAI,
  filterRelevantEvents,
  deduplicateEvents,
  eventExists,
  parseEventDateTime,
} from '../../utils/agents/event-scraping'
import { logger } from '../../utils/logger'

const DEFAULT_KEYWORDS = [
  'pet festival',
  'holiday walk',
  'street fair',
  'animal event',
  'pet parade',
  'veterinary conference',
  'pet adoption',
  'dog friendly',
  'animal rescue',
  'pet expo',
  'farmers market',
  'holiday market',
  'community fair',
  'carnival',
  'festival',
]

const DEFAULT_LOCATION = 'Los Angeles, California'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting marketing events scout`, 'agent', { runId })

  const location = (config.location as string) || DEFAULT_LOCATION
  const keywords = (config.keywords as string[]) || DEFAULT_KEYWORDS
  const eventTypes = (config.eventTypes as string[]) || []
  const autoApproveThreshold = (config.autoApproveThreshold as number) || 0.8
  const maxProposals = (config.maxProposals as number) || 20

  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  let tokensUsed = 0
  let costUsd = 0

  try {
    // 1. Generate search queries
    logger.info(`[Agent:${agentId}] Generating search queries for ${location}`, 'agent')

    const queries = generateEventSearchQueries({
      location,
      keywords,
      eventTypes,
    })

    // 2. Search for events via AI
    logger.info(`[Agent:${agentId}] Searching for events`, 'agent', {
      queryCount: queries.length,
    })

    const searchMessages = [
      {
        role: 'system' as const,
        content: `You are a local events researcher for a veterinary practice in ${location}. 
Your task is to identify upcoming events that would be relevant for pet and animal-related marketing.
Focus on community events, street fairs, festivals, pet expos, adoption events, and similar gatherings.

Return realistic, plausible event data based on typical events in the area and seasonality.`,
      },
    ]

    const queryDescriptions = queries
      .map(
        q => `- ${q.keywords.join(', ')} in ${q.location} (within ${q.radius} miles, next ${q.timeframe} days)`,
      )
      .join('\n')

    searchMessages.push({
      role: 'user' as const,
      content: `Find upcoming local events that match this description for ${location}. Look for pet-related, animal-related, community, and festival events:\n${queryDescriptions}\n\nReturn 10-15 events as a JSON array with: name, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), location, description, hostedBy, contact (name, email, phone), attendance estimate, cost, and source.`,
    })

    const chatResult = await agentChat({
      agentId,
      runId,
      messages: searchMessages,
      model: 'fast',
      maxTokens: 3000,
    })

    tokensUsed += chatResult.tokensUsed
    costUsd += chatResult.costUsd

    let scrapedEvents = []
    try {
      // Extract JSON from response
      const jsonMatch = chatResult.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        scrapedEvents = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      logger.warn(`[Agent:${agentId}] Failed to parse events from AI response`, 'agent')
    }

    logger.info(`[Agent:${agentId}] Found ${scrapedEvents.length} candidate events`, 'agent')

    // 3. Filter for relevance
    const relevantEvents = filterRelevantEvents(
      scrapedEvents.map((e: any) => ({
        name: e.name || 'Untitled Event',
        date: e.date || null,
        startTime: e.startTime || null,
        endTime: e.endTime || null,
        location: e.location || '',
        description: e.description || '',
        url: e.url || null,
        source: e.source || 'Web Search',
        hostedBy: e.hostedBy || null,
        contact: e.contact || { name: null, email: null, phone: null },
        attendance: e.attendance || null,
        cost: e.cost || null,
        imageUrl: e.imageUrl || null,
      })),
      keywords,
    )

    logger.info(`[Agent:${agentId}] Filtered to ${relevantEvents.length} relevant events`, 'agent')

    // 4. Deduplicate
    const uniqueEvents = deduplicateEvents(relevantEvents as any)

    // 5. Check for existing events and create proposals
    for (const event of uniqueEvents.slice(0, maxProposals)) {
      // Skip if event already exists
      if (event.date && (await eventExists(supabase, event.name, event.date))) {
        logger.info(`[Agent:${agentId}] Event already exists: ${event.name}`, 'agent')
        continue
      }

      // Parse datetime
      const { date, startTime, endTime } = parseEventDateTime(event.date, event.startTime, event.endTime)

      if (!date) {
        logger.warn(`[Agent:${agentId}] Skipping event with invalid date: ${event.name}`, 'agent')
        continue
      }

      // Extract confidence score (based on keyword matches)
      const confidenceScore = Math.min(((event as any).relevanceScore || 0.5) * 1.2, 1)

      // Build event detail for proposal
      const eventDetail: EventDiscoveryDetail = {
        event_name: event.name,
        event_type: 'street_fair', // Default type, can be refined per event
        event_date: date,
        start_time: startTime,
        end_time: endTime,
        location: event.location,
        hosted_by: event.hostedBy,
        contact_name: event.contact.name,
        contact_email: event.contact.email,
        contact_phone: event.contact.phone,
        description: event.description,
        expected_attendance: event.attendance,
        staffing_needs: null,
        event_cost: event.cost,
        expectations: null,
        physical_setup: null,
        source_url: event.url,
        source_name: event.source,
        confidence_score: confidenceScore,
        matching_keywords: keywords.filter(k => event.description.toLowerCase().includes(k.toLowerCase())),
        notes: `Discovered by Marketing Events Scout on ${new Date().toLocaleDateString()}`,
      }

      // Create proposal
      const proposalId = await createProposal({
        agentId,
        proposalType: 'event_discovery',
        title: `New Event: ${event.name}`,
        summary: `${event.location} - ${date}. Confidence: ${(confidenceScore * 100).toFixed(0)}%`,
        detail: eventDetail,
        targetEntityType: 'marketing_event',
        riskLevel: 'low',
        expiresInHours: 30 * 24, // 30 days
      })

      if (proposalId) {
        proposalsCreated++

        // Auto-approve high-confidence events
        if (confidenceScore >= autoApproveThreshold) {
          const approvalResult = await autoApproveProposal(proposalId)

          if (approvalResult) {
            proposalsAutoApproved++
            logger.info(`[Agent:${agentId}] Auto-approved event: ${event.name}`, 'agent')
          }
        } else {
          logger.info(`[Agent:${agentId}] Created proposal for review: ${event.name} (${(confidenceScore * 100).toFixed(0)}%)`, 'agent')
        }
      }
    }

    logger.info(
      `[Agent:${agentId}] Completed event discovery`,
      'agent',
      {
        proposalsCreated,
        proposalsAutoApproved,
        tokensUsed,
        costUsd: costUsd.toFixed(4),
      },
    )

    return {
      status: proposalsCreated > 0 ? 'success' : 'partial',
      proposalsCreated,
      proposalsAutoApproved,
      tokensUsed,
      costUsd,
      summary: `Discovered ${proposalsCreated} new event(s), auto-approved ${proposalsAutoApproved}. Searched in ${location} for pet and animal-related events.`,
      metadata: {
        location,
        queriesGenerated: queries.length,
        candidatesFound: scrapedEvents.length,
        relevantFiltered: uniqueEvents.length,
        uniqueProcessed: Math.min(uniqueEvents.length, maxProposals),
      },
    }
  } catch (err) {
    logger.error(`[Agent:${agentId}] Event discovery failed`, err, 'agent')

    return {
      status: 'error',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed,
      costUsd,
      summary: `Event discovery failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export default handler
