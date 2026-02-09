import { defineStore } from 'pinia'
import type { TimeOffRequest, TimeOffType } from '~/types/operations.types'

// =====================================================
// STATE
// =====================================================

interface OperationsTimeOffState {
  timeOffRequests: TimeOffRequest[]
  timeOffTypes: TimeOffType[]
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useOperationsTimeOffStore = defineStore('operations-time-off', {
  state: (): OperationsTimeOffState => ({
    timeOffRequests: [],
    timeOffTypes: [],
    isLoading: false,
    error: null
  }),

  getters: {
    // Pending time off requests
    pendingTimeOffRequests: (state) => state.timeOffRequests.filter(r => r.status === 'pending')
  },

  actions: {
    // =====================================================
    // TIME OFF REQUESTS
    // =====================================================

    async fetchTimeOffTypes() {
      const supabase = useSupabaseClient()

      try {
        // Only load active time off types (PTO, Unpaid Time Off, Other)
        const { data, error } = await supabase
          .from('time_off_types')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        this.timeOffTypes = data as TimeOffType[]
      } catch (err) {
        console.error('fetchTimeOffTypes error:', err)
      }
    },

    async fetchTimeOffRequests(employeeId?: string, status?: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        let query = supabase
          .from('time_off_requests')
          .select(`
            *,
            employee:employees!time_off_requests_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name
              )
            ),
            time_off_type:time_off_types (id, name, is_paid)
          `)
          .order('start_date', { ascending: false })

        if (employeeId) {
          query = query.eq('employee_id', employeeId)
        }
        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error
        this.timeOffRequests = data as TimeOffRequest[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch time off requests'
        console.error('fetchTimeOffRequests error:', err)
      }
    },

    async createTimeOffRequest(request: {
      employee_id: string
      time_off_type_id: string
      start_date: string
      end_date: string
      duration_hours?: number
    }) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('time_off_requests')
          .insert({
            ...request,
            status: 'pending',
            requested_at: new Date().toISOString()
          })
          .select(`
            *,
            employee:employees!time_off_requests_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name
              )
            ),
            time_off_type:time_off_types (id, name, is_paid)
          `)
          .single()

        if (error) throw error
        this.timeOffRequests.unshift(data as TimeOffRequest)
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create time off request'
        throw err
      }
    },

    async reviewTimeOffRequest(requestId: string, status: 'approved' | 'denied', approverId: string, comment?: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('time_off_requests')
          .update({
            status,
            approved_by_employee_id: approverId,
            approved_at: new Date().toISOString(),
            manager_comment: comment,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error

        const index = this.timeOffRequests.findIndex(r => r.id === requestId)
        if (index !== -1) {
          this.timeOffRequests[index].status = status
          this.timeOffRequests[index].approved_at = new Date().toISOString()
        }
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to review time off request'
        throw err
      }
    }
  }
})
