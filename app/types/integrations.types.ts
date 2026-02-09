/**
 * Integrations & Notifications Types
 * ====================================
 * Consolidated type definitions for notifications, action items,
 * Slack integration, and sync operations.
 *
 * Source files:
 *   - app/stores/integrations.ts (IntegrationNotification, NotificationData, ActionItem, PromotionCriteria, SkillRequirement)
 *   - app/pages/activity.vue (ActivityNotification)
 *   - app/composables/useSlack.ts (SlackMessage, SlackDM)
 *   - app/composables/useSlackSync.ts (SyncStatus, SyncConflict, SlackUser, NotificationTrigger)
 *
 * Duplicate resolution:
 *   - Notification: integrations.ts → IntegrationNotification, activity.vue → ActivityNotification
 *   - NotificationData: integrations.ts version kept (more specific than useSlack.ts index-signature)
 *   - SlackUser: useSlackSync.ts version kept (superset of useSlack.ts)
 */

// =====================================================
// NOTIFICATIONS
// =====================================================

/** Notification as modelled in the integrations store (DB-aligned) */
export interface IntegrationNotification {
  id: string
  profile_id: string
  type: string | null
  title: string | null
  body: string | null
  data: NotificationData | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

/** Notification as consumed by the activity page (extended view) */
export interface ActivityNotification {
  id: string
  profile_id: string
  type: string
  title: string
  body: string
  data: Record<string, any> | null
  is_read: boolean
  read_at: string | null
  closed_at: string | null
  created_at: string
  category: string
  requires_action: boolean
  action_url: string | null
  action_label: string | null
}

export interface NotificationData {
  entity_type?: string
  entity_id?: string
  action_url?: string
  action_label?: string
  secondary_action_url?: string
  secondary_action_label?: string
  metadata?: Record<string, any>
}

// =====================================================
// ACTION ITEMS & PROMOTIONS
// =====================================================

export interface ActionItem {
  id: string
  type: 'shift_swap' | 'time_off' | 'review' | 'training' | 'mentorship' | 'timesheet' | 'promotion'
  title: string
  description: string
  entity_id: string
  entity_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed' | 'dismissed'
  action_url?: string
  action_label?: string
  secondary_action_label?: string
  created_at: string
  due_date?: string
  from_employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface PromotionCriteria {
  employee_id: string
  employee_name: string
  current_position: string
  current_position_id: string
  recommended_position?: string
  recommended_position_id?: string
  current_hourly_rate?: number
  recommended_hourly_rate?: number
  rating: number
  meets_criteria: boolean
  criteria_details: {
    rating_met: boolean
    tenure_met: boolean
    skills_met: boolean
  }
}

export interface SkillRequirement {
  skill_id: string
  skill_name: string
  required_level: number
  current_level: number | null
  is_met: boolean
  course_id?: string
  course_title?: string
}

// =====================================================
// SLACK MESSAGING
// =====================================================

export interface SlackMessage {
  /** Channel ID or name (e.g., '#general' or 'C1234567890') */
  channel: string
  text: string
  /** Optional Block Kit blocks for rich formatting */
  blocks?: any[]
}

export interface SlackDM {
  /** Slack User ID (e.g., 'U1234567890') */
  userId: string
  text: string
  blocks?: any[]
}

/** Merged SlackUser — superset from useSlackSync.ts + useSlack.ts */
export interface SlackUser {
  id: string
  name: string
  real_name: string
  display_name: string
  email: string
  is_active: boolean
  avatar: string
}

// =====================================================
// SLACK SYNC
// =====================================================

export interface SyncStatus {
  lastSync: {
    id: string
    sync_type: string
    status: string
    started_at: string
    completed_at: string | null
    matched_count: number
    new_links_count: number
    deactivated_count: number
    errors_count: number
    pending_review_count: number
  } | null
  recentLogs: any[]
  pendingConflicts: number
  stats: {
    total: number
    linked: number
    unlinked: number
    deactivated: number
    pending_review: number
  }
}

export interface SyncConflict {
  id: string
  employee_id: string | null
  profile_id: string | null
  conflict_type: string
  employee_email: string | null
  slack_user_id: string | null
  slack_email: string | null
  slack_display_name: string | null
  status: string
  details: any
  created_at: string
  employee?: {
    id: string
    first_name: string
    last_name: string
    email_work: string
    employment_status: string
  }
}

export interface NotificationTrigger {
  id: string
  name: string
  description: string | null
  event_type: string
  is_active: boolean
  channel_target: string | null
  send_dm: boolean
  message_template: string | null
}
