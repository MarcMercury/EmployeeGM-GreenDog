import { defineStore } from 'pinia'
import type { 
  Schedule, 
  ScheduleInsert,
  TimeOffRequest,
  TimeOffRequestInsert,
  TimeOffStatus
} from '~/types/database.types'

interface ScheduleState {
  schedules: Schedule[]
  timeOffRequests: TimeOffRequest[]
  selectedDate: string
  viewMode: 'day' | 'week' | 'month'
  isLoading: boolean
  error: string | null
}

export const useScheduleStore = defineStore('schedule', {
  state: (): ScheduleState => ({
    schedules: [],
    timeOffRequests: [],
    selectedDate: new Date().toISOString().split('T')[0],
    viewMode: 'week',
    isLoading: false,
    error: null
  }),

  getters: {
    schedulesForDate: (state) => (date: string) => 
      state.schedules.filter(s => s.date === date),
    
    schedulesForEmployee: (state) => (profileId: string) =>
      state.schedules.filter(s => s.profile_id === profileId),
    
    pendingTimeOff: (state) => 
      state.timeOffRequests.filter(r => r.status === 'pending'),
    
    approvedTimeOff: (state) => 
      state.timeOffRequests.filter(r => r.status === 'approved'),

    timeOffForEmployee: (state) => (profileId: string) =>
      state.timeOffRequests.filter(r => r.profile_id === profileId),

    getWeekDates: (state) => {
      const selected = new Date(state.selectedDate)
      const day = selected.getDay()
      const diff = selected.getDate() - day
      
      const dates: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(selected)
        d.setDate(diff + i)
        dates.push(d.toISOString().split('T')[0])
      }
      return dates
    }
  },

  actions: {
    async fetchSchedules(startDate?: string, endDate?: string) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        let query = supabase
          .from('schedules')
          .select('*')

        if (startDate) {
          query = query.gte('date', startDate)
        }
        if (endDate) {
          query = query.lte('date', endDate)
        }

        const { data, error } = await query.order('date')

        if (error) throw error
        this.schedules = data as Schedule[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch schedules'
        console.error('Error fetching schedules:', err)
      } finally {
        this.isLoading = false
      }
    },

    async fetchTimeOffRequests(status?: TimeOffStatus) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true

      try {
        let query = supabase
          .from('time_off_requests')
          .select('*')

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query.order('start_date')

        if (error) throw error
        this.timeOffRequests = data as TimeOffRequest[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch time off requests'
      } finally {
        this.isLoading = false
      }
    },

    async createSchedule(schedule: ScheduleInsert) {
      const supabase = useSupabaseClient()
      
      try {
        const { data, error } = await supabase
          .from('schedules')
          .insert(schedule)
          .select()
          .single()

        if (error) throw error
        this.schedules.push(data as Schedule)
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create schedule'
        throw err
      }
    },

    async updateSchedule(id: string, updates: Partial<Schedule>) {
      const supabase = useSupabaseClient()
      
      try {
        const { data, error } = await supabase
          .from('schedules')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        
        const index = this.schedules.findIndex(s => s.id === id)
        if (index !== -1) {
          this.schedules[index] = data as Schedule
        }
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update schedule'
        throw err
      }
    },

    async deleteSchedule(id: string) {
      const supabase = useSupabaseClient()
      
      try {
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', id)

        if (error) throw error
        this.schedules = this.schedules.filter(s => s.id !== id)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete schedule'
        throw err
      }
    },

    async requestTimeOff(request: TimeOffRequestInsert) {
      const supabase = useSupabaseClient()
      
      try {
        const { data, error } = await supabase
          .from('time_off_requests')
          .insert(request)
          .select()
          .single()

        if (error) throw error
        this.timeOffRequests.push(data as TimeOffRequest)
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to submit time off request'
        throw err
      }
    },

    async reviewTimeOff(id: string, status: TimeOffStatus, notes?: string) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      
      try {
        const { data, error } = await supabase
          .from('time_off_requests')
          .update({
            status,
            reviewed_by: authStore.profile?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        
        const index = this.timeOffRequests.findIndex(r => r.id === id)
        if (index !== -1) {
          this.timeOffRequests[index] = data as TimeOffRequest
        }
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to review time off request'
        throw err
      }
    },

    setSelectedDate(date: string) {
      this.selectedDate = date
    },

    setViewMode(mode: 'day' | 'week' | 'month') {
      this.viewMode = mode
    },

    navigatePrevious() {
      const current = new Date(this.selectedDate)
      switch (this.viewMode) {
        case 'day':
          current.setDate(current.getDate() - 1)
          break
        case 'week':
          current.setDate(current.getDate() - 7)
          break
        case 'month':
          current.setMonth(current.getMonth() - 1)
          break
      }
      this.selectedDate = current.toISOString().split('T')[0]
    },

    navigateNext() {
      const current = new Date(this.selectedDate)
      switch (this.viewMode) {
        case 'day':
          current.setDate(current.getDate() + 1)
          break
        case 'week':
          current.setDate(current.getDate() + 7)
          break
        case 'month':
          current.setMonth(current.getMonth() + 1)
          break
      }
      this.selectedDate = current.toISOString().split('T')[0]
    },

    goToToday() {
      this.selectedDate = new Date().toISOString().split('T')[0]
    }
  }
})
