/**
 * Safety Log Store (Pinia Options API)
 *
 * Manages safety log state: list, filters, CRUD operations.
 * Uses useSupabaseClient() for direct DB access (same pattern as other stores).
 */

import { defineStore } from 'pinia'
import type {
  SafetyLog,
  SafetyLogInsert,
  SafetyLogUpdate,
  SafetyLogFilters,
  SafetyLogType,
  SafetyLogLocation,
  SafetyLogStatus,
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
     * Fetch logs with server-side filtering & pagination.
     */
    async fetchLogs() {
      this.loading = true
      try {
        const supabase = useSupabaseClient()
        let query = supabase
          .from('safety_logs')
          .select('*, submitter:submitted_by(id, first_name, last_name), reviewer:reviewed_by(id, first_name, last_name)', { count: 'exact' })
          .order('submitted_at', { ascending: false })

        // Apply filters
        if (this.filters.log_type) {
          query = query.eq('log_type', this.filters.log_type)
        }
        if (this.filters.location) {
          query = query.eq('location', this.filters.location)
        }
        if (this.filters.status) {
          query = query.eq('status', this.filters.status)
        }
        if (this.filters.osha_recordable !== null && this.filters.osha_recordable !== undefined) {
          query = query.eq('osha_recordable', this.filters.osha_recordable)
        }
        if (this.filters.date_from) {
          query = query.gte('submitted_at', this.filters.date_from)
        }
        if (this.filters.date_to) {
          query = query.lte('submitted_at', this.filters.date_to + 'T23:59:59')
        }

        // Pagination
        const from = (this.page - 1) * this.pageSize
        const to = from + this.pageSize - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) throw error

        this.logs = (data as unknown as SafetyLog[]) || []
        this.totalCount = count || 0
      } catch (err) {
        console.error('[SafetyLogStore] fetchLogs error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single log by ID.
     */
    async fetchLog(id: string) {
      this.loading = true
      try {
        const supabase = useSupabaseClient()
        const { data, error } = await supabase
          .from('safety_logs')
          .select('*, submitter:submitted_by(id, first_name, last_name), reviewer:reviewed_by(id, first_name, last_name)')
          .eq('id', id)
          .single()

        if (error) throw error
        this.currentLog = data as unknown as SafetyLog
        return this.currentLog
      } catch (err) {
        console.error('[SafetyLogStore] fetchLog error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new safety log entry.
     */
    async createLog(payload: SafetyLogInsert) {
      this.submitting = true
      try {
        const supabase = useSupabaseClient()
        const { data, error } = await supabase
          .from('safety_logs')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        return data as unknown as SafetyLog
      } catch (err) {
        console.error('[SafetyLogStore] createLog error:', err)
        throw err
      } finally {
        this.submitting = false
      }
    },

    /**
     * Update a log (review, flag, edit).
     */
    async updateLog(id: string, payload: SafetyLogUpdate) {
      this.submitting = true
      try {
        const supabase = useSupabaseClient()
        const { data, error } = await supabase
          .from('safety_logs')
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Update in local state
        const idx = this.logs.findIndex(l => l.id === id)
        if (idx >= 0) this.logs[idx] = data as unknown as SafetyLog
        if (this.currentLog?.id === id) this.currentLog = data as unknown as SafetyLog

        return data as unknown as SafetyLog
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
