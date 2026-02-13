import { defineStore } from 'pinia'
import { useOperationsStore } from '~/stores/operations'

// Types that match actual database schema
interface Schedule {
  id: string
  profile_id: string | null
  employee_id: string | null
  date: string
  shift_type: 'morning' | 'afternoon' | 'evening' | 'full-day' | 'off' | 'on-call'
  start_time: string | null
  end_time: string | null
  location_id: string | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface TimeOffRequest {
  id: string
  employee_id: string
  profile_id: string | null
  time_off_type_id: string
  start_date: string
  end_date: string
  duration_hours: number | null
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  reason: string | null
  requested_at: string
  approved_by_employee_id: string | null
  approved_at: string | null
  manager_comment: string | null
  created_at: string
  updated_at: string
}

type TimeOffStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

interface ScheduleState {
  schedules: Schedule[]
  timeOffRequests: TimeOffRequest[]
  timeOffTypes: { id: string; name: string; code: string }[]
  selectedDate: string
  viewMode: 'day' | 'week' | 'month'
  isLoading: boolean
  error: string | null
}

export const useScheduleStore = defineStore('schedule', {
  state: (): ScheduleState => ({
    schedules: [],
    timeOffRequests: [],
    timeOffTypes: [],
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
    },

    defaultTimeOffType: (state) => state.timeOffTypes[0]?.id
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
        this.schedules = (data || []) as Schedule[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch schedules'
        console.error('Error fetching schedules:', err)
      } finally {
        this.isLoading = false
      }
    },

    async fetchTimeOffTypes() {
      // Delegate to canonical source in operations store (M33 dedup)
      const opsStore = useOperationsStore()
      await opsStore.fetchTimeOffTypes()
      // Sync local state so consumers reading scheduleStore.timeOffTypes still work
      this.timeOffTypes = opsStore.timeOffTypes.map(t => ({ id: t.id, name: t.name, code: t.code || '' }))
    },

    async fetchTimeOffRequests(status?: TimeOffStatus) {
      const supabase = useSupabaseClient()
      
      this.isLoading = true

      try {
        this.error = null
        let query = supabase
          .from('time_off_requests')
          .select('*')

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query.order('start_date')

        if (error) throw error
        this.timeOffRequests = (data || []) as TimeOffRequest[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch time off requests'
      } finally {
        this.isLoading = false
      }
    },

    async createSchedule(schedule: Partial<Schedule>) {
      const supabase = useSupabaseClient()
      
      try {
        this.error = null
        const { data, error } = await supabase
          .from('schedules')
          .insert(schedule as any)
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
        this.error = null
        const { data, error } = await supabase
          .from('schedules')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          } as any)
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
        this.error = null
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

    async requestTimeOff(request: {
      employee_id?: string
      profile_id?: string
      start_date: string
      end_date: string
      reason?: string
    }) {
      const supabase = useSupabaseClient()
      
      try {
        this.error = null
        // Get default time off type if not loaded
        if (this.timeOffTypes.length === 0) {
          await this.fetchTimeOffTypes()
        }

        const timeOffTypeId = this.timeOffTypes[0]?.id
        if (!timeOffTypeId) {
          throw new Error('No time off types configured')
        }

        const { data, error } = await supabase
          .from('time_off_requests')
          .insert({
            employee_id: request.employee_id,
            profile_id: request.profile_id,
            time_off_type_id: timeOffTypeId,
            start_date: request.start_date,
            end_date: request.end_date,
            reason: request.reason,
            status: 'pending',
            requested_at: new Date().toISOString()
          } as any)
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

    async reviewTimeOff(id: string, status: 'approved' | 'denied', notes?: string) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()
      if ((authStore.profile as any)?.is_emergency) {
        throw new Error('Cannot review time-off requests in emergency admin mode')
      }
      
      try {
        this.error = null
        // Get current user's employee record
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.profile?.id)
          .single()

        const { data, error } = await supabase
          .from('time_off_requests')
          .update({
            status,
            approved_by_employee_id: empData?.id,
            approved_at: new Date().toISOString(),
            manager_comment: notes,
            updated_at: new Date().toISOString()
          } as any)
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
