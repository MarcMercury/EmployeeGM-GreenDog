/**
 * Slack Integration Composable
 * ============================
 * Provides functions to send messages to Slack channels and users.
 * Uses the Slack Bot Token configured in environment variables.
 * Includes notification helpers for common Employee GM events.
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

interface NotificationData {
  [key: string]: any
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

  /**
   * Send a notification for a specific event type
   * Uses the notification queue for reliable delivery
   */
  const sendEventNotification = async (
    eventType: string,
    data: NotificationData
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await $fetch('/api/slack/notifications/send-event', {
        method: 'POST',
        body: { eventType, data }
      })
      return response as { ok: boolean; error?: string }
    } catch (error: any) {
      console.error('Slack sendEventNotification error:', error)
      return { ok: false, error: error.message }
    }
  }

  /**
   * Notify about new employee onboarding
   */
  const notifyNewEmployee = async (employee: {
    first_name: string
    last_name: string
    position?: string
    department?: string
    start_date?: string
    slack_user_id?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('employee_onboarding', {
      employee_name: `${employee.first_name} ${employee.last_name}`,
      position: employee.position || 'New Team Member',
      department: employee.department || '',
      start_date: employee.start_date || 'Soon',
      slack_user_id: employee.slack_user_id
    })
  }

  /**
   * Notify about visitor arrival
   */
  const notifyVisitorArrival = async (visitor: {
    visitor_type: string
    first_name: string
    last_name: string
    coordinator?: string
    location?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('visitor_arrival', {
      visitor_name: `${visitor.first_name} ${visitor.last_name}`,
      visit_type: visitor.visitor_type,
      coordinator: visitor.coordinator || 'TBD',
      location: visitor.location || ''
    })
  }

  /**
   * Notify about time off request (to manager)
   */
  const notifyTimeOffRequest = async (request: {
    employee_name: string
    dates: string
    manager_slack_id?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('time_off_requested', {
      employee_name: request.employee_name,
      dates: request.dates,
      slack_user_id: request.manager_slack_id
    })
  }

  /**
   * Notify employee about time off approval
   */
  const notifyTimeOffApproved = async (request: {
    dates: string
    employee_slack_id?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('time_off_approved', {
      dates: request.dates,
      slack_user_id: request.employee_slack_id
    })
  }

  /**
   * Notify about schedule being published
   */
  const notifySchedulePublished = async (schedule: {
    period: string
    location?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('schedule_published', {
      period: schedule.period,
      location: schedule.location || ''
    })
  }

  /**
   * Notify about training completion
   */
  const notifyTrainingCompleted = async (training: {
    employee_name: string
    training_name: string
    employee_slack_id?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('training_completed', {
      employee_name: training.employee_name,
      training_name: training.training_name,
      slack_user_id: training.employee_slack_id
    })
  }

  /**
   * Notify about expiring certification
   */
  const notifyCertificationExpiring = async (cert: {
    certification_name: string
    expiry_date: string
    employee_slack_id?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    return sendEventNotification('certification_expiring', {
      certification_name: cert.certification_name,
      expiry_date: cert.expiry_date,
      slack_user_id: cert.employee_slack_id
    })
  }

  return {
    sendToChannel,
    sendDM,
    findUserByEmail,
    formatVisitorAnnouncement,
    // Event notifications
    sendEventNotification,
    notifyNewEmployee,
    notifyVisitorArrival,
    notifyTimeOffRequest,
    notifyTimeOffApproved,
    notifySchedulePublished,
    notifyTrainingCompleted,
    notifyCertificationExpiring
  }
}
