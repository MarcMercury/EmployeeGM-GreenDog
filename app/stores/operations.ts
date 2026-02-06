import { defineStore } from 'pinia'

// =====================================================
// TYPES
// =====================================================

export interface Shift {
  id: string
  employee_id: string | null
  location_id: string | null
  department_id: string | null
  start_at: string
  end_at: string
  status: 'draft' | 'published' | 'completed' | 'missed' | 'cancelled'
  is_open_shift: boolean
  published_at: string | null
  created_by_employee_id: string | null
  created_at: string
  updated_at: string
  // Joined data
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }
  } | null
  location?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

export interface TimePunch {
  id: string
  employee_id: string
  punch_type: 'in' | 'out'
  punched_at: string
  clock_device_id: string | null
  latitude: number | null
  longitude: number | null
  geo_accuracy_meters: number | null
  geofence_id: string | null
  within_geofence: boolean | null
  violation_reason: string | null
  source: string | null
  notes: string | null
  created_at: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  shift_id: string | null
  clock_in_at: string | null
  clock_out_at: string | null
  total_hours: number | null
  is_approved: boolean
  approved_by_employee_id: string | null
  approved_at: string | null
  correction_reason: string | null
  created_at: string
  updated_at: string
  // Joined data
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }
  } | null
  shift?: Shift | null
}

export interface TimeOffRequest {
  id: string
  employee_id: string
  time_off_type_id: string
  start_date: string
  end_date: string
  duration_hours: number | null
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  requested_at: string
  approved_by_employee_id: string | null
  approved_at: string | null
  manager_comment: string | null
  created_at: string
  updated_at: string
  // Joined data
  employee?: {
    id: string
    profile: {
      first_name: string | null
      last_name: string | null
    }
  } | null
  time_off_type?: { id: string; name: string; is_paid: boolean } | null
}

export interface TimeOffType {
  id: string
  name: string
  is_paid: boolean
  default_hours_per_day: number | null
}

export interface ShiftChange {
  id: string
  shift_id: string
  from_employee_id: string | null
  to_employee_id: string | null
  type: string | null
  status: string
  requested_at: string
  resolved_at: string | null
  manager_employee_id: string | null
  manager_comment: string | null
  created_at: string
  // Joined data
  shift?: Shift | null
  from_employee?: { id: string; profile: { first_name: string | null; last_name: string | null } } | null
  to_employee?: { id: string; profile: { first_name: string | null; last_name: string | null } } | null
}

export interface Geofence {
  id: string
  name: string
  location_id: string | null
  latitude: number | null
  longitude: number | null
  radius_meters: number
  is_active: boolean
}

export interface ConflictResult {
  hasConflict: boolean
  type: 'time_off' | 'overlap' | null
  message: string | null
  details?: TimeOffRequest | Shift | null
}

// =====================================================
// STATE
// =====================================================

interface OperationsState {
  // Shifts
  shifts: Shift[]
  weekStart: string
  weekEnd: string
  
  // Time Clock
  currentPunchStatus: 'in' | 'out' | null
  todayPunches: TimePunch[]
  todayWorkedMinutes: number
  
  // Time Entries (Manager view)
  timeEntries: TimeEntry[]
  
  // Time Off
  timeOffRequests: TimeOffRequest[]
  timeOffTypes: TimeOffType[]
  
  // Shift Changes
  shiftChanges: ShiftChange[]
  
  // Geofences
  geofences: Geofence[]
  
  // UI State
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useOperationsStore = defineStore('operations', {
  state: (): OperationsState => ({
    shifts: [],
    weekStart: '',
    weekEnd: '',
    currentPunchStatus: null,
    todayPunches: [],
    todayWorkedMinutes: 0,
    timeEntries: [],
    timeOffRequests: [],
    timeOffTypes: [],
    shiftChanges: [],
    geofences: [],
    isLoading: false,
    error: null
  }),

  getters: {
    // Get shifts grouped by employee for calendar Y-axis
    shiftsByEmployee: (state) => {
      const grouped: Record<string, Shift[]> = {}
      state.shifts.forEach(shift => {
        const key = shift.employee_id || 'unassigned'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(shift)
      })
      return grouped
    },

    // Get shifts grouped by day for calendar X-axis
    shiftsByDay: (state) => {
      const grouped: Record<string, Shift[]> = {}
      state.shifts.forEach(shift => {
        const day = shift.start_at.split('T')[0]
        if (!grouped[day]) grouped[day] = []
        grouped[day].push(shift)
      })
      return grouped
    },

    // Published shifts only (employee view)
    publishedShifts: (state) => state.shifts.filter(s => s.status === 'published'),

    // Draft shifts only (admin view)
    draftShifts: (state) => state.shifts.filter(s => s.status === 'draft'),

    // Get my upcoming shifts (next 5)
    myUpcomingShifts: (state) => (employeeId: string) => {
      const now = new Date().toISOString()
      return state.shifts
        .filter(s => s.employee_id === employeeId && s.start_at > now && s.status === 'published')
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        .slice(0, 5)
    },

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

    // Pending time off requests
    pendingTimeOffRequests: (state) => state.timeOffRequests.filter(r => r.status === 'pending'),

    // Pending shift changes
    pendingShiftChanges: (state) => state.shiftChanges.filter(c => c.status === 'pending'),

    // Active geofences
    activeGeofences: (state) => state.geofences.filter(g => g.is_active)
  },

  actions: {
    // =====================================================
    // SHIFT MANAGEMENT
    // =====================================================

    async fetchShifts(startDate: string, endDate: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true
      this.error = null
      this.weekStart = startDate
      this.weekEnd = endDate

      try {
        const { data, error } = await supabase
          .from('shifts')
          .select(`
            *,
            employee:employees!shifts_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name,
                avatar_url
              )
            ),
            location:locations (id, name),
            department:departments (id, name)
          `)
          .gte('start_at', startDate)
          .lte('start_at', endDate)
          .order('start_at')

        if (error) throw error
        this.shifts = data as Shift[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch shifts'
        console.error('fetchShifts error:', err)
      } finally {
        this.isLoading = false
      }
    },

    async createShift(shift: Partial<Shift>) {
      const supabase = useSupabaseClient()

      try {
        // Check for conflicts first
        if (shift.employee_id) {
          const conflict = await this.checkConflicts(
            shift.employee_id,
            shift.start_at!,
            shift.end_at!
          )
          if (conflict.hasConflict) {
            throw new Error(conflict.message || 'Schedule conflict detected')
          }
        }

        const { data, error } = await supabase
          .from('shifts')
          .insert({
            employee_id: shift.employee_id,
            location_id: shift.location_id,
            department_id: shift.department_id,
            start_at: shift.start_at,
            end_at: shift.end_at,
            status: shift.status || 'draft',
            is_open_shift: shift.is_open_shift || false,
            created_by_employee_id: shift.created_by_employee_id
          })
          .select(`
            *,
            employee:employees!shifts_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name,
                avatar_url
              )
            ),
            location:locations (id, name),
            department:departments (id, name)
          `)
          .single()

        if (error) throw error
        this.shifts.push(data as Shift)
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create shift'
        throw err
      }
    },

    async updateShift(shiftId: string, updates: Partial<Shift>) {
      const supabase = useSupabaseClient()

      try {
        // If reassigning to a new employee, check conflicts
        if (updates.employee_id) {
          const existingShift = this.shifts.find(s => s.id === shiftId)
          if (existingShift) {
            const conflict = await this.checkConflicts(
              updates.employee_id,
              updates.start_at || existingShift.start_at,
              updates.end_at || existingShift.end_at,
              shiftId // Exclude current shift from conflict check
            )
            if (conflict.hasConflict) {
              throw new Error(conflict.message || 'Schedule conflict detected')
            }
          }
        }

        const { data, error } = await supabase
          .from('shifts')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', shiftId)
          .select(`
            *,
            employee:employees!shifts_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (
                first_name,
                last_name,
                avatar_url
              )
            ),
            location:locations (id, name),
            department:departments (id, name)
          `)
          .single()

        if (error) throw error

        const index = this.shifts.findIndex(s => s.id === shiftId)
        if (index !== -1) {
          this.shifts[index] = data as Shift
        }
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update shift'
        throw err
      }
    },

    async deleteShift(shiftId: string) {
      const supabase = useSupabaseClient()

      try {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shiftId)

        if (error) throw error
        this.shifts = this.shifts.filter(s => s.id !== shiftId)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete shift'
        throw err
      }
    },

    async publishShifts(shiftIds: string[]) {
      const supabase = useSupabaseClient()

      try {
        const { error } = await supabase
          .from('shifts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', shiftIds)

        if (error) throw error

        // Update local state
        shiftIds.forEach(id => {
          const shift = this.shifts.find(s => s.id === id)
          if (shift) {
            shift.status = 'published'
            shift.published_at = new Date().toISOString()
          }
        })
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to publish shifts'
        throw err
      }
    },

    // =====================================================
    // CONFLICT DETECTION
    // =====================================================

    async checkConflicts(
      employeeId: string,
      startAt: string,
      endAt: string,
      excludeShiftId?: string
    ): Promise<ConflictResult> {
      const supabase = useSupabaseClient()
      const startDate = startAt.split('T')[0]
      const endDate = endAt.split('T')[0]

      try {
        // Check 1: Does user have approved time off for this date?
        const { data: timeOff, error: toError } = await supabase
          .from('time_off_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('status', 'approved')
          .lte('start_date', endDate)
          .gte('end_date', startDate)
          .limit(1)

        if (toError) throw toError

        if (timeOff && timeOff.length > 0) {
          return {
            hasConflict: true,
            type: 'time_off',
            message: `Employee has approved time off from ${timeOff[0].start_date} to ${timeOff[0].end_date}`,
            details: timeOff[0] as TimeOffRequest
          }
        }

        // Check 2: Does user have overlapping shift?
        let query = supabase
          .from('shifts')
          .select('*')
          .eq('employee_id', employeeId)
          .neq('status', 'cancelled')
          .lt('start_at', endAt)
          .gt('end_at', startAt)

        if (excludeShiftId) {
          query = query.neq('id', excludeShiftId)
        }

        const { data: overlaps, error: olError } = await query.limit(1)

        if (olError) throw olError

        if (overlaps && overlaps.length > 0) {
          const overlap = overlaps[0]
          const overlapStart = new Date(overlap.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const overlapEnd = new Date(overlap.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return {
            hasConflict: true,
            type: 'overlap',
            message: `Employee already has a shift from ${overlapStart} to ${overlapEnd}`,
            details: overlap as Shift
          }
        }

        return { hasConflict: false, type: null, message: null }
      } catch (err) {
        console.error('checkConflicts error:', err)
        return { hasConflict: false, type: null, message: null }
      }
    },

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
        // Check geofence if location provided
        let geofenceResult: { geofence_id: string | null; within_geofence: boolean | null; violation_reason: string | null } = {
          geofence_id: null,
          within_geofence: null,
          violation_reason: null
        }

        if (location && this.activeGeofences.length > 0) {
          geofenceResult = this.checkGeofence(location.latitude, location.longitude)
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
        let geofenceResult: { geofence_id: string | null; within_geofence: boolean | null; violation_reason: string | null } = {
          geofence_id: null,
          within_geofence: null,
          violation_reason: null
        }

        if (location && this.activeGeofences.length > 0) {
          geofenceResult = this.checkGeofence(location.latitude, location.longitude)
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
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()

      // Ensure shifts are loaded for today
      if (this.shifts.length === 0) {
        await this.fetchShifts(today, today)
      }

      // Find matching shift for today - prefer one that overlaps with current time
      let todayShift = this.shifts.find(s =>
        s.employee_id === employeeId &&
        s.start_at.startsWith(today) &&
        s.status === 'published' &&
        new Date(s.start_at) <= now &&
        new Date(s.end_at) >= now
      )
      
      // Fallback: any published shift for today
      if (!todayShift) {
        todayShift = this.shifts.find(s =>
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
    },

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
    },

    // =====================================================
    // SHIFT CHANGES (Swap/Drop)
    // =====================================================

    async fetchShiftChanges(employeeId?: string) {
      const supabase = useSupabaseClient()

      try {
        let query = supabase
          .from('shift_changes')
          .select(`
            *,
            shift:shifts (*),
            from_employee:employees!shift_changes_from_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (first_name, last_name)
            ),
            to_employee:employees!shift_changes_to_employee_id_fkey (
              id,
              profile:profiles!employees_profile_id_fkey (first_name, last_name)
            )
          `)
          .order('requested_at', { ascending: false })

        if (employeeId) {
          query = query.or(`from_employee_id.eq.${employeeId},to_employee_id.eq.${employeeId}`)
        }

        const { data, error } = await query

        if (error) throw error
        this.shiftChanges = data as ShiftChange[]
      } catch (err) {
        console.error('fetchShiftChanges error:', err)
      }
    },

    async createShiftChange(change: {
      shift_id: string
      from_employee_id: string
      to_employee_id?: string
      type: 'swap' | 'drop'
    }) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('shift_changes')
          .insert({
            ...change,
            status: 'pending',
            requested_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create shift change request'
        throw err
      }
    },

    async resolveShiftChange(changeId: string, approved: boolean, managerId: string, comment?: string) {
      const supabase = useSupabaseClient()

      try {
        const change = this.shiftChanges.find(c => c.id === changeId)
        
        const { error } = await supabase
          .from('shift_changes')
          .update({
            status: approved ? 'approved' : 'denied',
            resolved_at: new Date().toISOString(),
            manager_employee_id: managerId,
            manager_comment: comment
          })
          .eq('id', changeId)

        if (error) throw error

        // If approved, update the shift assignment
        if (approved && change?.to_employee_id && change.shift_id) {
          await this.updateShift(change.shift_id, {
            employee_id: change.to_employee_id
          })
        } else if (approved && change?.type === 'drop' && change.shift_id) {
          // For drops, mark as open shift
          await this.updateShift(change.shift_id, {
            employee_id: null,
            is_open_shift: true
          })
        }

        // Refresh changes
        await this.fetchShiftChanges()
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to resolve shift change'
        throw err
      }
    }
  }
})
