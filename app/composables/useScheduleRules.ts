/**
 * Schedule Rules Composable - The "Conflict Engine"
 * Validates shift assignments before allowing drops
 */
import { differenceInMinutes } from 'date-fns'
import type { ScheduleShift, ScheduleEmployee, RuleValidationResult } from '~/types/schedule.types'

export type { ScheduleShift, ScheduleEmployee, RuleValidationResult }

export const useScheduleRules = () => {

  /**
   * Main Validator Function
   * Runs whenever a card is hovered over or dropped onto a slot.
   */
  const validateAssignment = (
    employee: ScheduleEmployee, 
    targetShift: ScheduleShift, 
    allShifts: ScheduleShift[]
  ): RuleValidationResult => {

    // 1. CRITICAL: Closed Clinic Check
    if (targetShift.status === 'closed_clinic') {
      return {
        valid: false,
        type: 'error',
        message: 'Clinic is closed at this location.'
      }
    }

    // 2. CRITICAL: The "Cloning" Rule (Double Booking)
    const targetStart = new Date(targetShift.start_at)
    const targetEnd = new Date(targetShift.end_at)

    const conflictingShift = allShifts.find(s => {
      // Skip the target shift itself
      if (s.id === targetShift.id) return false
      
      // Only check shifts assigned to THIS employee
      if (s.employee_id !== employee.id) return false

      // Check Time Overlap: (StartA < EndB) and (EndA > StartB)
      const sStart = new Date(s.start_at)
      const sEnd = new Date(s.end_at)
      const isOverlapping = (targetStart < sEnd) && (targetEnd > sStart)

      return isOverlapping
    })

    if (conflictingShift) {
      return {
        valid: false,
        type: 'error',
        message: `Conflict: ${employee.first_name} is already working during this time.`,
        conflictShiftId: conflictingShift.id
      }
    }

    // 3. WARNING: The "Qualification" Rule (Role Mismatch)
    if (targetShift.role_required) {
      const empTitle = employee.position?.title || ''
      if (targetShift.role_required.toLowerCase() !== empTitle.toLowerCase()) {
        return {
          valid: true,
          type: 'warning',
          message: `Role Mismatch: Shift needs "${targetShift.role_required}", but ${employee.first_name} is a "${empTitle}".`
        }
      }
    }

    // 4. WARNING: Overtime / Fatigue Rule
    const dailyMinutes = allShifts
      .filter(s => s.employee_id === employee.id && isSameDay(new Date(s.start_at), targetStart))
      .reduce((acc, s) => acc + differenceInMinutes(new Date(s.end_at), new Date(s.start_at)), 0)
    
    const newShiftDuration = differenceInMinutes(targetEnd, targetStart)
    
    if ((dailyMinutes + newShiftDuration) > 720) { // > 12 Hours
       return {
          valid: true,
          type: 'warning',
          message: `Fatigue Warning: This puts ${employee.first_name} over 12 hours today.`
       }
    }

    // All checks passed
    return { valid: true, type: 'success', message: null }
  }

  /**
   * Check if employee can be assigned (quick check for visual feedback)
   */
  const canAssign = (
    employee: ScheduleEmployee, 
    targetShift: ScheduleShift, 
    allShifts: ScheduleShift[]
  ): boolean => {
    const result = validateAssignment(employee, targetShift, allShifts)
    return result.valid || result.type === 'warning'
  }

  /**
   * Get validation class for visual feedback
   */
  const getValidationClass = (result: RuleValidationResult | null): string => {
    if (!result) return ''
    switch (result.type) {
      case 'error': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-amber-500 bg-amber-50'
      case 'success': return 'border-green-500 bg-green-50'
      default: return ''
    }
  }

  // Helper: Check same day
  const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  /**
   * Calculate hours between two ISO strings
   */
  const calculateHours = (start: string, end: string): number => {
    return differenceInMinutes(new Date(end), new Date(start)) / 60
  }

  /**
   * Get total hours for an employee in a shift list
   */
  const getEmployeeHours = (employeeId: string, shifts: ScheduleShift[]): number => {
    return shifts
      .filter(s => s.employee_id === employeeId)
      .reduce((acc, s) => acc + calculateHours(s.start_at, s.end_at), 0)
  }

  return {
    validateAssignment,
    canAssign,
    getValidationClass,
    calculateHours,
    getEmployeeHours,
    isSameDay
  }
}
