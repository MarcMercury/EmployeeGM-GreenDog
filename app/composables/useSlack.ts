/**
 * Slack Integration Composable
 * ============================
 * Provides functions to send messages to Slack channels and users.
 * Uses the Slack Bot Token configured in environment variables.
 */

interface SlackMessage {
  channel: string // Channel ID or name (e.g., '#general' or 'C1234567890')
  text: string
  blocks?: any[] // Optional Block Kit blocks for rich formatting
}

interface SlackDM {
  userId: string // Slack User ID (e.g., 'U1234567890')
  text: string
  blocks?: any[]
}

interface SlackUser {
  id: string
  email: string
  real_name: string
  display_name: string
}

export const useSlack = () => {
  const config = useRuntimeConfig()
  
  /**
   * Send a message to a Slack channel
   */
  const sendToChannel = async (message: SlackMessage): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await $fetch('/api/slack/send', {
        method: 'POST',
        body: {
          type: 'channel',
          channel: message.channel,
          text: message.text,
          blocks: message.blocks
        }
      })
      return response as { ok: boolean; error?: string }
    } catch (error: any) {
      console.error('Slack sendToChannel error:', error)
      return { ok: false, error: error.message }
    }
  }

  /**
   * Send a direct message to a Slack user
   */
  const sendDM = async (dm: SlackDM): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await $fetch('/api/slack/send', {
        method: 'POST',
        body: {
          type: 'dm',
          userId: dm.userId,
          text: dm.text,
          blocks: dm.blocks
        }
      })
      return response as { ok: boolean; error?: string }
    } catch (error: any) {
      console.error('Slack sendDM error:', error)
      return { ok: false, error: error.message }
    }
  }

  /**
   * Look up a Slack user by email address
   */
  const findUserByEmail = async (email: string): Promise<SlackUser | null> => {
    try {
      const response = await $fetch('/api/slack/find-user', {
        method: 'POST',
        body: { email }
      })
      return (response as any).user || null
    } catch (error: any) {
      console.error('Slack findUserByEmail error:', error)
      return null
    }
  }

  /**
   * Format a visitor announcement for Slack
   */
  const formatVisitorAnnouncement = (visitor: {
    visitor_type: string
    first_name: string
    last_name: string
    school_of_origin?: string | null
    organization_name?: string | null
    email?: string | null
    program_name?: string | null
    location?: string | null
    visit_start_date?: string | null
    visit_end_date?: string | null
    coordinator?: string | null
    mentor?: string | null
    reason_for_visit?: string | null
  }): string => {
    const typeLabels: Record<string, string> = {
      intern: 'INTERN',
      extern: 'EXTERN',
      student: 'STUDENT',
      ce_attendee: 'CE ATTENDEE',
      shadow: 'SHADOW',
      other: 'VISITOR'
    }
    
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return 'TBD'
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
    }

    const visitorType = typeLabels[visitor.visitor_type] || 'VISITOR'
    const name = `${visitor.first_name} ${visitor.last_name}`.trim()
    const school = visitor.school_of_origin || visitor.organization_name || 'N/A'
    const email = visitor.email || 'N/A'
    const program = visitor.program_name || 'N/A'
    const location = visitor.location || 'TBD'
    const arriving = formatDate(visitor.visit_start_date)
    const leaving = formatDate(visitor.visit_end_date)
    const contact = visitor.coordinator ? `@${visitor.coordinator}` : 'TBD'
    const shadowing = visitor.mentor || 'Any DVM'
    const reason = visitor.reason_for_visit || ''

    return `🆕 *NEW ${visitorType} ANNOUNCEMENT*
0. *Visiting From:* ${school}
1. *NAME:* ${name}
2. *E-Mail:* ${email}
3. *Level:* ${program}
4. *Clinic Location:* ${location}
5. *Arriving:* ${arriving}
5. *Leaving:* ${leaving}
6. *GDD Contact:* ${contact}
7. *Shadowing:* ${shadowing}
8. *Reason for Visit:* ${reason}`
  }

  return {
    sendToChannel,
    sendDM,
    findUserByEmail,
    formatVisitorAnnouncement
  }
}
