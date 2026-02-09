import { defineStore } from 'pinia'
import type { TimePunch, TimeEntry, Geofence } from '~/types/operations.types'
import { useOperationsShiftsStore } from './operationsShifts'

// =====================================================
// STATE
// =====================================================

interface OperationsTimeTrackingState {
  currentPunchStatus: 'in' | 'out' | null
  todayPunches: TimePunch[]
  todayWorkedMinutes: number
  timeEntries: TimeEntry[]
  geofences: Geofence[]
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useOperationsTimeTrackingStore = defineStore('operations-time-tracking', {
  state: (): OperationsTimeTrackingState => ({
    currentPunchStatus: null,
    todayPunches: [],
    todayWorkedMinutes: 0,
    timeEntries: [],
    geofences: [],
    isLoading: false,
    error: null
  }),

  getters: {
    // Time entries needing approval
    pendingTimeEntries: (state) => state.timeEntries.filter(e => !e.is_approved),

    // Time entries with overtime risk
    overtimeRiskEntries: (state) => state.timeEntries.filter(e => {
      if (!e.shift || !e.total_hours) return false
      const scheduledHours = (new Date(e.shift.end_at).getTime() - new Date(e.shift.start_at).getTime()) / (1000 * 60 * 60)
      return e.total_hours > scheduledHours
    }),

    // Time entries with missing punches
    missingPunchEntries: (state) => state.timeEntries.filter(e => 
      e.clock_in_at && !e.clock_out_at
    ),

    // Active geofences
    activeGeofences: (state) => state.geofences.filter(g => g.is_active)
  },

  actions: {
    // =====================================================
    // TIME CLOCK (PUNCHES)
    // =====================================================

    async fetchTodayPunches(employeeId: string) {
      const supabase = useSupabaseClient()
      const today = new Date().toISOString().split('T')[0]

      try {
        const { data, error } = await supabase
          .from('time_punches')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('punched_at', `${today}T00:00:00`)
          .lt('punched_at', `${today}T23:59:59`)
          .order('punched_at')

        if (error) throw error

        this.todayPunches = data as TimePunch[]
        this.calculateWorkedMinutes()
        this.determineCurrentStatus()
      } catch (err) {
        console.error('fetchTodayPunches error:', err)
      }
    },

    determineCurrentStatus() {
      if (this.todayPunches.length === 0) {
        this.currentPunchStatus = 'out'
        return
      }
      const lastPunch = this.todayPunches[this.todayPunches.length - 1]
      this.currentPunchStatus = lastPunch.punch_type === 'in' ? 'in' : 'out'
    },

    calculateWorkedMinutes() {
      let totalMinutes = 0
      const punches = [...this.todayPunches].sort((a, b) => 
        new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
      )

      for (let i = 0; i < punches.length; i += 2) {
        const clockIn = punches[i]
        const clockOut = punches[i + 1]

        if (clockIn?.punch_type === 'in') {
          const inTime = new Date(clockIn.punched_at).getTime()
          const outTime = clockOut
            ? new Date(clockOut.punched_at).getTime()
            : Date.now() // If still clocked in, use current time

          totalMinutes += (outTime - inTime) / (1000 * 60)
        }
      }

      this.todayWorkedMinutes = Math.round(totalMinutes)
    },

    async clockIn(employeeId: string, location?: { latitude: number; longitude: number; accuracy: number }) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        // Server-side geofence check — prevents client bypass
        let geofenceResult: { geofence_id: string | null; within_geofence: boolean | null; violation_reason: string | null } = {
          geofence_id: null,
          within_geofence: null,
          violation_reason: null
        }

        if (location) {
          try {
            const result = await $fetch('/api/operations/check-geofence', {
              method: 'POST',
              body: { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy }
            })
            geofenceResult = {
              geofence_id: result.geofence_id,
              within_geofence: result.within_geofence,
              violation_reason: result.violation_reason
            }
          } catch (geoErr) {
            console.warn('Geofence check failed, proceeding without:', geoErr)
          }
        }

        const { data, error } = await supabase
          .from('time_punches')
          .insert({
            employee_id: employeeId,
            punch_type: 'in',
            punched_at: new Date().toISOString(),
            latitude: location?.latitude,
            longitude: location?.longitude,
            geo_accuracy_meters: location?.accuracy,
            ...geofenceResult,
            source: 'web'
          })
          .select()
          .single()

        if (error) throw error

        this.todayPunches.push(data as TimePunch)
        this.currentPunchStatus = 'in'
        this.calculateWorkedMinutes()

        return { success: true, punch: data, geofenceWarning: geofenceResult.violation_reason }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to clock in'
        throw err
      }
    },

    async clockOut(employeeId: string, location?: { latitude: number; longitude: number; accuracy: number }) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        // Server-side geofence check — prevents client bypass
        let geofenceResult: { geofence_id: string | null; within_geofence: boolean | null; violation_reason: string | null } = {
          geofence_id: null,
          within_geofence: null,
          violation_reason: null
        }

        if (location) {
          try {
            const result = await $fetch('/api/operations/check-geofence', {
              method: 'POST',
              body: { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy }
            })
            geofenceResult = {
              geofence_id: result.geofence_id,
              within_geofence: result.within_geofence,
              violation_reason: result.violation_reason
            }
          } catch (geoErr) {
            console.warn('Geofence check failed, proceeding without:', geoErr)
          }
        }

        const { data, error } = await supabase
          .from('time_punches')
          .insert({
            employee_id: employeeId,
            punch_type: 'out',
            punched_at: new Date().toISOString(),
            latitude: location?.latitude,
            longitude: location?.longitude,
            geo_accuracy_meters: location?.accuracy,
            ...geofenceResult,
            source: 'web'
          })
          .select()
          .single()

        if (error) throw error

        this.todayPunches.push(data as TimePunch)
        this.currentPunchStatus = 'out'
        this.calculateWorkedMinutes()

        // Create or update time entry
        await this.createTimeEntry(employeeId)

        return { success: true, punch: data, geofenceWarning: geofenceResult.violation_reason }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to clock out'
        throw err
      }
    },

    /** @deprecated Use server-side /api/operations/check-geofence instead. Kept for offline fallback only. */
    checkGeofence(latitude: number, longitude: number): { geofence_id: string | null; within_geofence: boolean | null; violation_reason: string | null } {
      for (const fence of this.activeGeofences) {
        if (fence.latitude && fence.longitude) {
          const distance = this.haversineDistance(
            latitude,
            longitude,
            fence.latitude,
            fence.longitude
          )

          if (distance <= fence.radius_meters) {
            return {
              geofence_id: fence.id,
              within_geofence: true,
              violation_reason: null
            }
          }
        }
      }

      // No geofence matched
      return {
        geofence_id: null,
        within_geofence: false,
        violation_reason: 'Location is outside all defined geofences'
      }
    },

    haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371000 // Earth radius in meters
      const dLat = this.toRad(lat2 - lat1)
      const dLon = this.toRad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },

    toRad(deg: number): number {
      return deg * (Math.PI / 180)
    },

    // =====================================================
    // GEOFENCES
    // =====================================================

    async fetchGeofences() {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('geofences')
          .select('*')
          .eq('is_active', true)

        if (error) throw error
        this.geofences = data as Geofence[]
      } catch (err) {
        console.error('fetchGeofences error:', err)
      }
    },

    // =====================================================
    // TIME ENTRIES
    // =====================================================

    async createTimeEntry(employeeId: string) {
      const supabase = useSupabaseClient()
      const shiftsStore = useOperationsShiftsStore()
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()

      // Ensure shifts are loaded for today
      if (shiftsStore.shifts.length === 0) {
        await shiftsStore.fetchShifts(today, today)
      }

      // Find matching shift for today - prefer one that overlaps with current time
      let todayShift = shiftsStore.shifts.find(s =>
        s.employee_id === employeeId &&
        s.start_at.startsWith(today) &&
        s.status === 'published' &&
        new Date(s.start_at) <= now &&
        new Date(s.end_at) >= now
      )
      
      // Fallback: any published shift for today
      if (!todayShift) {
        todayShift = shiftsStore.shifts.find(s =>
          s.employee_id === employeeId &&
          s.start_at.startsWith(today) &&
          s.status === 'published'
        )
      }

      // Get first clock in and last clock out
      const clockIn = this.todayPunches.find(p => p.punch_type === 'in')
      const clockOut = [...this.todayPunches].reverse().find(p => p.punch_type === 'out')

      if (!clockIn || !clockOut) return

      const totalHours = (new Date(clockOut.punched_at).getTime() - new Date(clockIn.punched_at).getTime()) / (1000 * 60 * 60)

      try {
        // Check if entry already exists for today
        const { data: existing } = await supabase
          .from('time_entries')
          .select('id')
          .eq('employee_id', employeeId)
          .gte('clock_in_at', `${today}T00:00:00`)
          .limit(1)

        if (existing && existing.length > 0) {
          // Update existing
          await supabase
            .from('time_entries')
            .update({
              clock_out_at: clockOut.punched_at,
              total_hours: Math.round(totalHours * 100) / 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing[0].id)
        } else {
          // Create new
          await supabase
            .from('time_entries')
            .insert({
              employee_id: employeeId,
              shift_id: todayShift?.id || null,
              clock_in_at: clockIn.punched_at,
              clock_out_at: clockOut.punched_at,
              total_hours: Math.round(totalHours * 100) / 100
            })
        }
      } catch (err) {
        console.error('createTimeEntry error:', err)
      }
    },

    async fetchTimeEntries(startDate: string, endDate: string, employeeId?: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true

      try {
        this.error = null
        let query = supabase
          .from('time_entries')
          .select(`
            *,
            employee:employees!time_entries_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name,
                avatar_url
              )
            ),
            shift:shifts (*)
          `)
          .gte('clock_in_at', startDate)
          .lte('clock_in_at', endDate)

        if (employeeId) {
          query = query.eq('employee_id', employeeId)
        }

        const { data, error } = await query.order('clock_in_at', { ascending: false })

        if (error) throw error
        this.timeEntries = data as TimeEntry[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch time entries'
        console.error('fetchTimeEntries error:', err)
      } finally {
        this.isLoading = false
      }
    },

    async approveTimeEntry(entryId: string, approverId: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('time_entries')
          .update({
            is_approved: true,
            approved_by_employee_id: approverId,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', entryId)
          .select()
          .single()

        if (error) throw error

        const index = this.timeEntries.findIndex(e => e.id === entryId)
        if (index !== -1) {
          this.timeEntries[index].is_approved = true
          this.timeEntries[index].approved_at = new Date().toISOString()
        }
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to approve time entry'
        throw err
      }
    }
  }
})
