/**
 * Agent Notification Processing Cron
 *
 * GET /api/cron/agent-notifications
 *
 * Runs every 2 minutes via Vercel cron. Processes pending items
 * in the notification_queue that were queued by agents.
 * Also sweeps approved proposals that haven't been applied yet.
 */

export default defineEventHandler(async (event) => {
  // Verify cron secret
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret

  if (!cronSecret) {
    throw createError({ statusCode: 500, message: 'CRON_SECRET not configured' })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  logger.cron('agent-notifications', 'started', { timestamp: new Date().toISOString() })

  const results = {
    slackSent: 0,
    slackFailed: 0,
    proposalsApplied: 0,
  }

  try {
    const client = createAdminClient() as any
    const slackBotToken = config.slackBotToken as string

    // ── 1. Process Slack notification queue ─────────────────────────

    if (slackBotToken) {
      const now = new Date().toISOString()

      const { data: notifications } = await client
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(30)

      for (const notif of (notifications ?? [])) {
        try {
          let channelId = notif.channel

          // If it's a DM, open conversation first
          if (notif.slack_user_id && !channelId) {
            const openRes = await fetch('https://slack.com/api/conversations.open', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${slackBotToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ users: notif.slack_user_id }),
            })
            const openData = (await openRes.json()) as any
            if (openData.ok) {
              channelId = openData.channel.id
            }
          }

          if (!channelId) {
            throw new Error('No channel or slack_user_id specified')
          }

          const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${slackBotToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: channelId,
              text: notif.message,
              blocks: notif.blocks,
            }),
          })

          const msgData = (await msgRes.json()) as any
          if (!msgData.ok) throw new Error(`Slack error: ${msgData.error}`)

          await client
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', notif.id)

          results.slackSent++
        } catch (err) {
          const retryCount = (notif.retry_count ?? 0) + 1
          const shouldRetry = retryCount < (notif.max_retries ?? 3)

          await client
            .from('notification_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: retryCount,
              error_message: err instanceof Error ? err.message : String(err),
            })
            .eq('id', notif.id)

          results.slackFailed++
        }
      }
    }

    // ── 2. Apply approved proposals ─────────────────────────────────

    // Import dynamically to avoid circular deps at module level
    const { processApprovedProposals } = await import('../../utils/agents/appliers')
    results.proposalsApplied = await processApprovedProposals()

    logger.cron('agent-notifications', 'completed', results)

    return { success: true, ...results }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[AgentNotifications] Fatal error', err instanceof Error ? err : undefined, 'cron')
    return { success: false, error: message, ...results }
  }
})
