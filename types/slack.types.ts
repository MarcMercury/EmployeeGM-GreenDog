/**
 * Slack Integration Types
 * =======================
 * TypeScript interfaces for Slack synchronization and notification system
 */

// Slack Sync Status types
export type SlackStatus = 'linked' | 'unlinked' | 'deactivated' | 'pending_review' | 'mismatch'

export type SyncType = 'scheduled' | 'manual' | 'user_update' | 'deactivation'

export type SyncStatus = 'success' | 'partial' | 'failed' | 'in_progress'

export type ConflictType = 'no_match' | 'multiple_matches' | 'email_mismatch' | 'deactivated_in_slack'

export type ConflictResolutionStatus = 'pending' | 'resolved' | 'ignored'

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

// Database Row types
export interface SlackSyncLog {
  id: string
  sync_type: SyncType
  status: SyncStatus
  started_at: string
  completed_at: string | null
  total_employees: number
  matched_count: number
  new_links_count: number
  deactivated_count: number
  errors_count: number
  pending_review_count: number
  error_details: any[] | null
  summary: Record<string, any> | null
  triggered_by: string
  created_at: string
}

export interface SlackSyncConflict {
  id: string
  employee_id: string | null
  profile_id: string | null
  conflict_type: ConflictType
  employee_email: string | null
  slack_user_id: string | null
  slack_email: string | null
  slack_display_name: string | null
  details: Record<string, any> | null
  status: ConflictResolutionStatus
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

export interface NotificationQueueItem {
  id: string
  trigger_id: string | null
  channel: string | null
  slack_user_id: string | null
  message: string
  blocks: any[] | null
  status: NotificationStatus
  priority: number
  scheduled_for: string | null
  sent_at: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

// API Response types
export interface SyncStatusResponse {
  ok: boolean
  lastSync: SlackSyncLog | null
  recentLogs: Partial<SlackSyncLog>[]
  pendingConflicts: number
  stats: {
    total: number
    linked: number
    unlinked: number
    deactivated: number
    pending_review: number
  }
}

export interface SyncRunResponse {
  ok: boolean
  syncLogId?: string
  summary?: {
    total_employees: number
    matched_count: number
    new_links_count: number
    deactivated_count: number
    pending_review_count: number
    errors_count: number
  }
  error?: string
}

export interface SlackUserInfo {
  id: string
  name: string
  real_name: string
  display_name: string
  email: string
  is_active: boolean
  avatar: string
}

// Event Notification types
export type NotificationEventType = 
  | 'employee_onboarding'
  | 'visitor_arrival'
  | 'schedule_published'
  | 'time_off_approved'
  | 'time_off_requested'
  | 'training_completed'
  | 'certification_expiring'

export interface NotificationEventData {
  // Common fields
  slack_user_id?: string
  
  // Employee onboarding
  employee_name?: string
  position?: string
  department?: string
  start_date?: string
  
  // Visitor
  visitor_name?: string
  visit_type?: string
  coordinator?: string
  location?: string
  
  // Schedule
  period?: string
  
  // Time off
  dates?: string
  
  // Training
  training_name?: string
  
  // Certification
  certification_name?: string
  expiry_date?: string
}
