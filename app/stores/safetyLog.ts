/**
 * Safety Log Store (Pinia Options API)
 *
 * Manages safety log state: list, filters, CRUD operations.
 * Routes all DB access through server API endpoints for consistent
 * authorization, validation, and row-level scoping.
 */

import { defineStore } from 'pinia'
import type {
  SafetyLog,
  SafetyLogUpdate,
  SafetyLogFilters,
  SafetyLogType,
} from '~/types/safety-log.types'

interface SafetyLogState {
  logs: SafetyLog[]
  currentLog: SafetyLog | null
  loading: boolean
  submitting: boolean
  filters: SafetyLogFilters
  totalCount: number
  page: number
  pageSize: number
}

export const useSafetyLogStore = defineStore('safetyLog', {
  state: (): SafetyLogState => ({
    logs: [],
    currentLog: null,
    loading: false,
    submitting: false,
    filters: {
      log_type: null,
      location: null,
      status: null,
      osha_recordable: null,
      date_from: null,
      date_to: null,
      search: null,
    },
    totalCount: 0,
    page: 1,
    pageSize: 25,
  }),

  getters: {
    /** Logs filtered by current filters (client-side fallback) */
    filteredLogs(state): SafetyLog[] {
      return state.logs
    },

    /** Stats for dashboard tiles */
    stats(state) {
      const total = state.logs.length
      const oshaCount = state.logs.filter(l => l.osha_recordable).length
      const flaggedCount = state.logs.filter(l => l.status === 'flagged').length
      const pendingReview = state.logs.filter(l => l.status === 'submitted').length

      // Count by type
      const byType: Partial<Record<SafetyLogType, number>> = {}
      for (const log of state.logs) {
        byType[log.log_type] = (byType[log.log_type] || 0) + 1
      }

      return { total, oshaCount, flaggedCount, pendingReview, byType }
    },
  },

  actions: {
    /**
     * Fetch logs with server-side filtering & pagination via API.
     */
    async fetchLogs() {
      this.loading = true
      try {
        const params: Record<string, string> = {
          page: String(this.page),
          pageSize: String(this.pageSize),
        }
        if (this.filters.log_type) params.log_type = this.filters.log_type
        if (this.filters.location) params.location = this.filters.location
        if (this.filters.status) params.status = this.filters.status
        if (this.filters.osha_recordable !== null && this.filters.osha_recordable !== undefined) {
          params.osha_recordable = String(this.filters.osha_recordable)
        }
        if (this.filters.date_from) params.date_from = this.filters.date_from
        if (this.filters.date_to) params.date_to = this.filters.date_to

        const result = await $fetch<{ data: SafetyLog[]; total: number; page: number; pageSize: number }>('/api/safety-log', {
          params,
        })

        this.logs = result.data || []
        this.totalCount = result.total || 0
      } catch (err) {
        console.error('[SafetyLogStore] fetchLogs error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single log by ID via API.
     */
    async fetchLog(id: string) {
      this.loading = true
      try {
        const result = await $fetch<{ data: SafetyLog }>(`/api/safety-log/${id}`)
        this.currentLog = result.data
        return this.currentLog
      } catch (err) {
        console.error('[SafetyLogStore] fetchLog error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update a log (review, flag, edit) via API.
     */
    async updateLog(id: string, payload: SafetyLogUpdate) {
      this.submitting = true
      try {
        const result = await $fetch<{ data: SafetyLog }>(`/api/safety-log/${id}`, {
          method: 'PUT',
          body: payload,
        })

        const updated = result.data

        // Update in local state
        const idx = this.logs.findIndex(l => l.id === id)
        if (idx >= 0) this.logs[idx] = updated
        if (this.currentLog?.id === id) this.currentLog = updated

        return updated
      } catch (err) {
        console.error('[SafetyLogStore] updateLog error:', err)
        throw err
      } finally {
        this.submitting = false
      }
    },

    /**
     * Set filters and re-fetch.
     */
    async applyFilters(filters: Partial<SafetyLogFilters>) {
      this.filters = { ...this.filters, ...filters }
      this.page = 1
      await this.fetchLogs()
    },

    /**
     * Change page and re-fetch.
     */
    async goToPage(page: number) {
      this.page = page
      await this.fetchLogs()
    },

    /**
     * Reset all state.
     */
    $reset() {
      this.logs = []
      this.currentLog = null
      this.loading = false
      this.submitting = false
      this.filters = {
        log_type: null,
        location: null,
        status: null,
        osha_recordable: null,
        date_from: null,
        date_to: null,
        search: null,
      }
      this.totalCount = 0
      this.page = 1
    },
  },
})
