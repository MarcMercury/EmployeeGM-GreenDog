/**
 * Schedule Builder Store (Pinia)
 * Manages draft state for the schedule builder with save/publish functionality
 */
import { defineStore } from 'pinia'
import type { ScheduleShift, ScheduleEmployee } from '~/composables/useScheduleRules'

interface ShiftTemplate {
  start_time: string // e.g., "09:00"
  end_time: string   // e.g., "17:00"
  role_required: string | null
}

interface ScheduleBuilderState {
  // Draft shifts (local state, not saved)
  draftShifts: ScheduleShift[]
  // Original shifts from database (for comparison)
  dbShifts: ScheduleShift[]
  // Selected week
  selectedWeekStart: string // ISO date string
  // Loading states
  isLoading: boolean
  isSaving: boolean
  isPublishing: boolean
  // Error
  error: string | null
  // Default shift templates per location
  defaultShiftTemplates: ShiftTemplate[]
}

export const useScheduleBuilderStore = defineStore('scheduleBuilder', {
  state: (): ScheduleBuilderState => ({
    draftShifts: [],
    dbShifts: [],
    selectedWeekStart: getMonday(new Date()).toISOString(),
    isLoading: false,
    isSaving: false,
    isPublishing: false,
    error: null,
    // Default shift times - can be customized
    defaultShiftTemplates: [
      { start_time: '08:00', end_time: '16:00', role_required: null },
      { start_time: '09:00', end_time: '17:00', role_required: null },
      { start_time: '10:00', end_time: '18:00', role_required: null }
    ]
  }),

  getters: {
    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges(): boolean {
      if (this.draftShifts.length !== this.dbShifts.length) return true
      
      return this.draftShifts.some((draft, i) => {
        const db = this.dbShifts.find(s => s.id === draft.id)
        if (!db) return true
        return draft.employee_id !== db.employee_id ||
               draft.status !== db.status
      })
    },

    /**
     * Get shifts grouped by date
     */
    shiftsByDate(): Record<string, ScheduleShift[]> {
      const grouped: Record<string, ScheduleShift[]> = {}
      this.draftShifts.forEach(shift => {
        const date = shift.start_at?.split('T')[0]
        if (date) {
          if (!grouped[date]) grouped[date] = []
          grouped[date].push(shift)
        }
      })
      return grouped
    },

    /**
     * Get shifts grouped by location
     */
    shiftsByLocation(): Record<string, ScheduleShift[]> {
      const grouped: Record<string, ScheduleShift[]> = {}
      this.draftShifts.forEach(shift => {
        if (shift.location_id) {
          const key = shift.location_id
          if (!grouped[key]) grouped[key] = []
          grouped[key]!.push(shift)
        }
      })
      return grouped
    },

    /**
     * Total hours scheduled
     */
    totalHoursScheduled(): number {
      return this.draftShifts
        .filter(s => s.employee_id)
        .reduce((acc, s) => {
          const start = new Date(s.start_at)
          const end = new Date(s.end_at)
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }, 0)
    },

    /**
     * Count of filled vs open shifts
     */
    shiftStats(): { filled: number; open: number; closed: number } {
      return {
        filled: this.draftShifts.filter(s => s.employee_id != null).length,
        open: this.draftShifts.filter(s => s.employee_id == null && s.status !== 'closed_clinic').length,
        closed: this.draftShifts.filter(s => s.status === 'closed_clinic').length
      }
    }
  },

  actions: {
    /**
     * Load shifts for a week from database
     */
    async loadWeek(weekStart: Date) {
      const client = useSupabaseClient()
      this.isLoading = true
      this.error = null
      this.selectedWeekStart = weekStart.toISOString()

      try {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        const { data, error } = await client
          .from('shifts')
          .select(`
            id,
            start_at,
            end_at,
            location_id,
            employee_id,
            role_required,
            status,
            is_published,
            is_open_shift,
            locations:location_id ( name )
          `)
          .gte('start_at', weekStart.toISOString())
          .lt('start_at', weekEnd.toISOString())
          .order('start_at')

        if (error) throw error

        const shifts: ScheduleShift[] = (data || []).map((s: any) => ({
          id: s.id,
          start_at: s.start_at,
          end_at: s.end_at,
          location_id: s.location_id,
          location_name: s.locations?.name,
          employee_id: s.employee_id,
          role_required: s.role_required,
          status: s.status || 'draft',
          is_published: s.is_published || false,
          is_open_shift: s.is_open_shift || false,
          is_new: false // DB shifts are not new
        }))

        // Store both draft and db versions
        this.dbShifts = JSON.parse(JSON.stringify(shifts))
        this.draftShifts = shifts

      } catch (e: any) {
        this.error = e.message || 'Failed to load shifts'
        console.error('[ScheduleBuilder] Load error:', e)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Add a new shift slot to the draft
     */
    addShift(locationId: string, locationName: string, date: Date, startTime: string, endTime: string, roleRequired?: string) {
      const dateStr = date.toISOString().split('T')[0]
      const startAt = `${dateStr}T${startTime}:00`
      const endAt = `${dateStr}T${endTime}:00`
      
      const newShift: ScheduleShift = {
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        start_at: startAt,
        end_at: endAt,
        location_id: locationId,
        location_name: locationName,
        employee_id: null,
        role_required: roleRequired || null,
        status: 'draft',
        is_published: false,
        is_open_shift: true,
        is_new: true // Mark as new for saving
      }
      
      this.draftShifts.push(newShift)
      return newShift.id
    },

    /**
     * Remove a shift from draft (only unsaved or allow delete saved)
     */
    removeShift(shiftId: string) {
      this.draftShifts = this.draftShifts.filter(s => s.id !== shiftId)
    },

        // Store both draft and db versions
        this.dbShifts = JSON.parse(JSON.stringify(shifts))
        this.draftShifts = shifts

      } catch (e: any) {
        this.error = e.message || 'Failed to load shifts'
        console.error('[ScheduleBuilder] Load error:', e)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Assign employee to a shift (draft only)
     */
    assignEmployee(shiftId: string, employeeId: string | null) {
      const shift = this.draftShifts.find(s => s.id === shiftId)
      if (shift) {
        shift.employee_id = employeeId
        shift.status = employeeId ? 'published' : 'draft'
      }
    },

    /**
     * Unassign employee from a shift
     */
    unassignEmployee(shiftId: string) {
      this.assignEmployee(shiftId, null)
    },

    /**
     * Close a clinic/location for a day
     */
    closeLocation(locationId: string, date: string) {
      this.draftShifts
        .filter(s => s.location_id === locationId && s.start_at.startsWith(date))
        .forEach(s => {
          s.employee_id = null
          s.status = 'closed_clinic'
        })
    },

    /**
     * Reopen a clinic/location for a day
     */
    reopenLocation(locationId: string, date: string) {
      this.draftShifts
        .filter(s => s.location_id === locationId && s.start_at.startsWith(date))
        .forEach(s => {
          s.status = 'draft'
        })
    },

    /**
     * Discard all draft changes
     */
    discardChanges() {
      this.draftShifts = JSON.parse(JSON.stringify(this.dbShifts))
    },

    /**
     * Save draft to database (without publishing)
     */
    async saveDraft() {
      const client = useSupabaseClient()
      this.isSaving = true
      this.error = null

      try {
        // 1. Insert new shifts
        const newShifts = this.draftShifts.filter(s => (s as any).is_new)
        if (newShifts.length > 0) {
          const insertData = newShifts.map(shift => ({
            location_id: shift.location_id,
            start_at: shift.start_at,
            end_at: shift.end_at,
            employee_id: shift.employee_id,
            role_required: shift.role_required,
            status: shift.status || 'draft',
            is_published: false,
            is_open_shift: !shift.employee_id
          }))

          const { data: insertedShifts, error: insertError } = await (client
            .from('shifts') as ReturnType<typeof client.from>)
            .insert(insertData)
            .select('id')

          if (insertError) throw insertError

          // Update local IDs with DB IDs
          if (insertedShifts) {
            newShifts.forEach((shift, idx) => {
              if (insertedShifts[idx]) {
                const oldId = shift.id
                shift.id = insertedShifts[idx].id
                ;(shift as any).is_new = false
              }
            })
          }
        }

        // 2. Update changed existing shifts
        const changedShifts = this.draftShifts.filter(draft => {
          if ((draft as any).is_new) return false
          const db = this.dbShifts.find(s => s.id === draft.id)
          if (!db) return false
          return draft.employee_id !== db.employee_id ||
                 draft.status !== db.status
        })

        for (const shift of changedShifts) {
          const { error } = await (client
            .from('shifts') as ReturnType<typeof client.from>)
            .update({
              employee_id: shift.employee_id,
              status: shift.status,
              is_open_shift: !shift.employee_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', shift.id)

          if (error) throw error
        }

        // Sync db state
        this.dbShifts = JSON.parse(JSON.stringify(this.draftShifts))

        return true
      } catch (e: any) {
        this.error = e.message || 'Failed to save'
        console.error('[ScheduleBuilder] Save error:', e)
        return false
      } finally {
        this.isSaving = false
      }
    },

    /**
     * Publish the schedule (save + mark as published + notify)
     */
    async publishSchedule() {
      const client = useSupabaseClient()
      this.isPublishing = true
      this.error = null

      try {
        // First save any draft changes
        await this.saveDraft()

        // Mark all shifts as published
        const weekEnd = new Date(this.selectedWeekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)

        // Note: Using type assertion until Supabase types are regenerated
        const { error } = await (client
          .from('shifts') as ReturnType<typeof client.from>)
          .update({ is_published: true, status: 'published' })
          .gte('start_at', this.selectedWeekStart)
          .lt('start_at', weekEnd.toISOString())

        if (error) throw error

        // Update local state
        this.draftShifts.forEach(s => s.is_published = true)
        this.dbShifts.forEach(s => s.is_published = true)

        // TODO: Trigger notifications via Edge Function

        return true
      } catch (e: any) {
        this.error = e.message || 'Failed to publish'
        console.error('[ScheduleBuilder] Publish error:', e)
        return false
      } finally {
        this.isPublishing = false
      }
    }
  }
})

// Helper: Get Monday of a week
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
