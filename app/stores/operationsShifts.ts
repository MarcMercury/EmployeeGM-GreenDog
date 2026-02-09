import { defineStore } from 'pinia'
import type { Shift, ShiftChange, ConflictResult, TimeOffRequest } from '~/types/operations.types'

// =====================================================
// STATE
// =====================================================

interface OperationsShiftsState {
  shifts: Shift[]
  weekStart: string
  weekEnd: string
  shiftChanges: ShiftChange[]
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useOperationsShiftsStore = defineStore('operations-shifts', {
  state: (): OperationsShiftsState => ({
    shifts: [],
    weekStart: '',
    weekEnd: '',
    shiftChanges: [],
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

    // Pending shift changes
    pendingShiftChanges: (state) => state.shiftChanges.filter(c => c.status === 'pending')
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
        this.error = null
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
        this.error = null
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
        this.error = null
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
        this.error = null
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
        this.error = null
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
        this.error = null
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
