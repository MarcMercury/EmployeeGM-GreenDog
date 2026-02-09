/**
 * Slack Synchronization Composable
 * =================================
 * Provides reactive state and methods for Slack synchronization
 * and notification management in the Employee GM application.
 */

import type { SyncStatus, SyncConflict, SlackUser, NotificationTrigger } from '~/types/integrations.types'

export const useSlackSync = () => {
  // Reactive state
  const syncStatus = ref<SyncStatus | null>(null)
  const conflicts = ref<SyncConflict[]>([])
  const slackUsers = ref<SlackUser[]>([])
  const triggers = ref<NotificationTrigger[]>([])
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch current sync status
   */
  const fetchSyncStatus = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch<any>('/api/slack/sync/status')
      
      if (response.ok) {
        syncStatus.value = {
          lastSync: response.lastSync,
          recentLogs: response.recentLogs,
          pendingConflicts: response.pendingConflicts,
          stats: response.stats
        }
      } else {
        error.value = response.error
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('Failed to fetch sync status:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Run a full synchronization
   */
  const runSync = async (force = false) => {
    isSyncing.value = true
    error.value = null

    try {
      const response = await $fetch<any>('/api/slack/sync/run', {
        method: 'POST',
        body: { force, triggered_by: 'admin' }
      })

      if (response.ok) {
        // Refresh status after sync
        await fetchSyncStatus()
        await fetchConflicts()
        return { ok: true, summary: response.summary }
      } else {
        error.value = response.error
        return { ok: false, error: response.error }
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('Sync failed:', err)
      return { ok: false, error: error.value }
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Fetch pending conflicts
   */
  const fetchConflicts = async (status = 'pending') => {
    try {
      const response = await $fetch<any>('/api/slack/sync/conflicts', {
        query: { status }
      })

      if (response.ok) {
        conflicts.value = response.conflicts
      }
    } catch (err: unknown) {
      console.error('Failed to fetch conflicts:', err)
    }
  }

  /**
   * Resolve a sync conflict
   */
  const resolveConflict = async (
    conflictId: string, 
    action: 'link' | 'ignore' | 'manual_link',
    slackUserId?: string,
    notes?: string
  ) => {
    try {
      const response = await $fetch<any>('/api/slack/sync/resolve', {
        method: 'POST',
        body: { conflictId, action, slackUserId, notes }
      })

      if (response.ok) {
        // Remove from local list
        conflicts.value = conflicts.value.filter(c => c.id !== conflictId)
        await fetchSyncStatus()
        return { ok: true }
      } else {
        return { ok: false, error: response.error }
      }
    } catch (err: unknown) {
      console.error('Failed to resolve conflict:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Manually link an employee to Slack
   */
  const linkEmployee = async (
    employeeId: string,
    slackUserId?: string,
    email?: string
  ) => {
    try {
      const response = await $fetch<any>('/api/slack/sync/link-user', {
        method: 'POST',
        body: { employeeId, slackUserId, email }
      })

      if (response.ok) {
        await fetchSyncStatus()
        return { ok: true, slackUserId: response.slackUserId }
      } else {
        return { ok: false, error: response.error }
      }
    } catch (err: unknown) {
      console.error('Failed to link employee:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Fetch all Slack users for selection
   */
  const fetchSlackUsers = async () => {
    try {
      const response = await $fetch<any>('/api/slack/sync/users')

      if (response.ok) {
        slackUsers.value = response.users
      }
    } catch (err: unknown) {
      console.error('Failed to fetch Slack users:', err)
    }
  }

  /**
   * Fetch notification triggers
   */
  const fetchTriggers = async () => {
    try {
      const response = await $fetch<any>('/api/slack/notifications/triggers')

      if (response.ok) {
        triggers.value = response.triggers
      }
    } catch (err: unknown) {
      console.error('Failed to fetch triggers:', err)
    }
  }

  /**
   * Update a notification trigger
   */
  const updateTrigger = async (id: string, updates: Partial<NotificationTrigger>) => {
    try {
      const response = await $fetch<any>('/api/slack/notifications/triggers', {
        method: 'PUT',
        body: { id, ...updates }
      })

      if (response.ok) {
        // Update local state
        const index = triggers.value.findIndex(t => t.id === id)
        if (index !== -1) {
          triggers.value[index] = response.trigger
        }
        return { ok: true }
      } else {
        return { ok: false, error: response.error }
      }
    } catch (err: unknown) {
      console.error('Failed to update trigger:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Send an event notification
   */
  const sendEventNotification = async (
    eventType: string,
    data: Record<string, any>,
    overrideChannel?: string,
    overrideMessage?: string
  ) => {
    try {
      const response = await $fetch<any>('/api/slack/notifications/send-event', {
        method: 'POST',
        body: { eventType, data, overrideChannel, overrideMessage }
      })

      return response
    } catch (err: unknown) {
      console.error('Failed to send notification:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Process pending notifications
   */
  const processNotifications = async () => {
    try {
      const response = await $fetch<any>('/api/slack/notifications/process', {
        method: 'POST'
      })

      return response
    } catch (err: unknown) {
      console.error('Failed to process notifications:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // Computed properties
  const linkageRate = computed(() => {
    if (!syncStatus.value?.stats.total) return 0
    return Math.round((syncStatus.value.stats.linked / syncStatus.value.stats.total) * 100)
  })

  const hasPendingConflicts = computed(() => {
    return (syncStatus.value?.pendingConflicts || 0) > 0
  })

  const lastSyncTime = computed(() => {
    if (!syncStatus.value?.lastSync?.completed_at) return null
    return new Date(syncStatus.value.lastSync.completed_at)
  })

  return {
    // State
    syncStatus,
    conflicts,
    slackUsers,
    triggers,
    isLoading,
    isSyncing,
    error,

    // Computed
    linkageRate,
    hasPendingConflicts,
    lastSyncTime,

    // Methods
    fetchSyncStatus,
    runSync,
    fetchConflicts,
    resolveConflict,
    linkEmployee,
    fetchSlackUsers,
    fetchTriggers,
    updateTrigger,
    sendEventNotification,
    processNotifications
  }
}
