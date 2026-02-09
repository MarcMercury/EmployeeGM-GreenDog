// =====================================================
// Operations Store — Backward-compatible re-export layer
// Split into focused sub-stores:
//   - operationsShifts.ts       → Shift CRUD, publishing, conflict detection, shift changes
//   - operationsTimeTracking.ts → Clock in/out, time punches, time entries, geofencing
//   - operationsTimeOff.ts      → Time off requests, reviews, types
// =====================================================

import { reactive, type UnwrapRef } from 'vue'

export { useOperationsShiftsStore } from './operationsShifts'
export { useOperationsTimeTrackingStore } from './operationsTimeTracking'
export { useOperationsTimeOffStore } from './operationsTimeOff'

// Re-export types so existing `import type { Shift } from '~/stores/operations'` keeps working
export type { Shift, ShiftChange, ConflictResult, TimePunch, TimeEntry, TimeOffRequest, TimeOffType, Geofence } from '~/types/operations.types'

import { useOperationsShiftsStore } from './operationsShifts'
import { useOperationsTimeTrackingStore } from './operationsTimeTracking'
import { useOperationsTimeOffStore } from './operationsTimeOff'

/**
 * Legacy facade — returns a reactive composite object that delegates to the
 * three sub-stores.  Existing callers (`const ops = useOperationsStore()`)
 * continue to work unchanged.
 */
export function useOperationsStore() {
  const shifts = useOperationsShiftsStore()
  const tt = useOperationsTimeTrackingStore()
  const to = useOperationsTimeOffStore()

  return reactive({
    // ----- Shifts state -----
    get shifts() { return shifts.shifts },
    set shifts(v) { shifts.shifts = v },
    get weekStart() { return shifts.weekStart },
    get weekEnd() { return shifts.weekEnd },
    get shiftChanges() { return shifts.shiftChanges },

    // ----- Time tracking state -----
    get currentPunchStatus() { return tt.currentPunchStatus },
    get todayPunches() { return tt.todayPunches },
    get todayWorkedMinutes() { return tt.todayWorkedMinutes },
    get timeEntries() { return tt.timeEntries },
    get geofences() { return tt.geofences },

    // ----- Time off state -----
    get timeOffRequests() { return to.timeOffRequests },
    get timeOffTypes() { return to.timeOffTypes },

    // ----- Combined UI state -----
    get isLoading() { return shifts.isLoading || tt.isLoading || to.isLoading },
    get error() { return shifts.error || tt.error || to.error },

    // ----- Shift getters -----
    get shiftsByEmployee() { return shifts.shiftsByEmployee },
    get shiftsByDay() { return shifts.shiftsByDay },
    get publishedShifts() { return shifts.publishedShifts },
    get draftShifts() { return shifts.draftShifts },
    get myUpcomingShifts() { return shifts.myUpcomingShifts },
    get pendingShiftChanges() { return shifts.pendingShiftChanges },

    // ----- Time tracking getters -----
    get pendingTimeEntries() { return tt.pendingTimeEntries },
    get overtimeRiskEntries() { return tt.overtimeRiskEntries },
    get missingPunchEntries() { return tt.missingPunchEntries },
    get activeGeofences() { return tt.activeGeofences },

    // ----- Time off getters -----
    get pendingTimeOffRequests() { return to.pendingTimeOffRequests },

    // ----- Shift actions -----
    fetchShifts: (...args: Parameters<typeof shifts.fetchShifts>) => shifts.fetchShifts(...args),
    createShift: (...args: Parameters<typeof shifts.createShift>) => shifts.createShift(...args),
    updateShift: (...args: Parameters<typeof shifts.updateShift>) => shifts.updateShift(...args),
    deleteShift: (...args: Parameters<typeof shifts.deleteShift>) => shifts.deleteShift(...args),
    publishShifts: (...args: Parameters<typeof shifts.publishShifts>) => shifts.publishShifts(...args),
    checkConflicts: (...args: Parameters<typeof shifts.checkConflicts>) => shifts.checkConflicts(...args),
    fetchShiftChanges: (...args: Parameters<typeof shifts.fetchShiftChanges>) => shifts.fetchShiftChanges(...args),
    createShiftChange: (...args: Parameters<typeof shifts.createShiftChange>) => shifts.createShiftChange(...args),
    resolveShiftChange: (...args: Parameters<typeof shifts.resolveShiftChange>) => shifts.resolveShiftChange(...args),

    // ----- Time tracking actions -----
    fetchTodayPunches: (...args: Parameters<typeof tt.fetchTodayPunches>) => tt.fetchTodayPunches(...args),
    clockIn: (...args: Parameters<typeof tt.clockIn>) => tt.clockIn(...args),
    clockOut: (...args: Parameters<typeof tt.clockOut>) => tt.clockOut(...args),
    checkGeofence: (...args: Parameters<typeof tt.checkGeofence>) => tt.checkGeofence(...args),
    fetchGeofences: (...args: Parameters<typeof tt.fetchGeofences>) => tt.fetchGeofences(...args),
    createTimeEntry: (...args: Parameters<typeof tt.createTimeEntry>) => tt.createTimeEntry(...args),
    fetchTimeEntries: (...args: Parameters<typeof tt.fetchTimeEntries>) => tt.fetchTimeEntries(...args),
    approveTimeEntry: (...args: Parameters<typeof tt.approveTimeEntry>) => tt.approveTimeEntry(...args),

    // ----- Time off actions -----
    fetchTimeOffTypes: (...args: Parameters<typeof to.fetchTimeOffTypes>) => to.fetchTimeOffTypes(...args),
    fetchTimeOffRequests: (...args: Parameters<typeof to.fetchTimeOffRequests>) => to.fetchTimeOffRequests(...args),
    createTimeOffRequest: (...args: Parameters<typeof to.createTimeOffRequest>) => to.createTimeOffRequest(...args),
    reviewTimeOffRequest: (...args: Parameters<typeof to.reviewTimeOffRequest>) => to.reviewTimeOffRequest(...args),

    // ----- Reset -----
    $reset() {
      shifts.$reset()
      tt.$reset()
      to.$reset()
    }
  })
}
