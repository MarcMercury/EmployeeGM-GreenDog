/**
 * Agent Notification Tool
 *
 * Utility for agents to send notifications through multiple channels:
 * - In-app notifications (notifications table)
 * - Slack via notification_queue
 *
 * This bridges agent proposals with the existing Slack notification system.
 */

interface AgentNotification {
  /** Target employee profile ID (for in-app) */
  profileId?: string
  /** Slack channel ID or user ID (for Slack DMs) */
  slackUserId?: string
  /** Slack channel name (e.g., '#alerts') — used for channel posts */
  slackChannel?: string
  /** Notification type label */
  type: string
  /** Short title */
  title: string
  /** Notification body text */
  body: string
  /** Notification category for Activity Hub grouping */
  category?: string
  /** Optional structured data */
  data?: Record<string, unknown>
  /** Priority: 'low' | 'normal' | 'high' | 'urgent' */
  priority?: string
  /** Agent ID for tracking */
  agentId?: string
}

/**
 * Send an in-app notification to a user's profile.
 */
export async function notifyInApp(opts: AgentNotification): Promise<boolean> {
  if (!opts.profileId) return false

  const client = createAdminClient() as any
  const { error } = await client.from('notifications').insert({
    profile_id: opts.profileId,
    type: opts.type,
    category: opts.category ?? 'system',
    title: opts.title,
    body: opts.body,
    data: opts.data ?? {},
    is_read: false,
  })

  if (error) {
    logger.warn('[AgentNotify] Failed to send in-app notification', 'agent', {
      profileId: opts.profileId,
      error: error.message,
    })
    return false
  }
  return true
}

/**
 * Queue a Slack notification via the existing notification_queue system.
 * The agent-notifications cron processes these every 2 minutes.
 */
export async function notifySlack(opts: AgentNotification): Promise<boolean> {
  const client = createAdminClient() as any

  // Build Slack message with rich formatting
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: opts.title, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: opts.body },
    },
  ]

  if (opts.agentId) {
    blocks.push({
      type: 'context' as any,
      elements: [
        { type: 'mrkdwn', text: `🤖 _Sent by agent: ${opts.agentId}_` },
      ],
    } as any)
  }

  const { error } = await client.from('notification_queue').insert({
    channel: opts.slackChannel ?? null,
    slack_user_id: opts.slackUserId ?? null,
    message: opts.body,
    blocks,
    priority: opts.priority ?? 'normal',
    status: 'pending',
    scheduled_for: new Date().toISOString(),
    metadata: {
      source: 'agent',
      agent_id: opts.agentId,
      notification_type: opts.type,
      ...(opts.data ?? {}),
    },
  })

  if (error) {
    logger.warn('[AgentNotify] Failed to queue Slack notification', 'agent', {
      error: error.message,
    })
    return false
  }
  return true
}

/**
 * Send notification to both in-app and Slack.
 */
export async function notifyAll(opts: AgentNotification): Promise<{ inApp: boolean; slack: boolean }> {
  const [inApp, slack] = await Promise.all([
    opts.profileId ? notifyInApp(opts) : Promise.resolve(false),
    (opts.slackUserId || opts.slackChannel) ? notifySlack(opts) : Promise.resolve(false),
  ])
  return { inApp, slack }
}

/**
 * Look up a Slack user ID from an employee's email.
 * Uses the profiles table which has slack_user_id if linked.
 */
export async function getSlackUserIdForEmployee(employeeId: string): Promise<string | null> {
  const client = createAdminClient() as any

  const { data: emp } = await client
    .from('employees')
    .select('profile_id')
    .eq('id', employeeId)
    .single()

  if (!emp?.profile_id) return null

  const { data: profile } = await client
    .from('profiles')
    .select('slack_user_id')
    .eq('id', emp.profile_id)
    .single()

  return profile?.slack_user_id ?? null
}
