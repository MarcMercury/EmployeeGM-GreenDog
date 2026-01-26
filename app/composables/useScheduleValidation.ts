/**
 * useScheduleValidation Composable
 * 
 * Provides shift validation against scheduling rules:
 * - max_hours_per_week
 * - max_hours_per_day  
 * - min_rest_between_shifts
 * - max_consecutive_days
 * - overtime_threshold
 * - time_off conflicts
 */

export interface ValidationViolation {
  rule: string
  type: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface ValidationResult {
  isValid: boolean
  violations: ValidationViolation[]
  hasErrors: boolean
  hasWarnings: boolean
  weeklyHours: number
}

export interface EmployeeHoursSummary {
  employeeId: string
  firstName: string
  lastName: string
  scheduledHours: number
  isOvertime: boolean
  isApproachingOvertime: boolean
  shiftCount: number
}

export function useScheduleValidation() {
  const supabase = useSupabaseClient()
  const toast = useToast()
  
  /**
   * Validate a shift assignment before creating it
   */
  async function validateShiftAssignment(
    employeeId: string,
    shiftDate: string, // YYYY-MM-DD
    startTime: string, // HH:MM
    endTime: string,   // HH:MM
    locationId?: string,
    excludeShiftId?: string
  ): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_shift_assignment', {
        p_employee_id: employeeId,
        p_shift_date: shiftDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_location_id: locationId || null,
        p_exclude_shift_id: excludeShiftId || null
      })
      
      if (error) {
        console.error('Validation error:', error)
        // Return valid with no violations on error (allow assignment)
        return {
          isValid: true,
          violations: [],
          hasErrors: false,
          hasWarnings: false,
          weeklyHours: 0
        }
      }
      
      const result = data?.[0] || { is_valid: true, violations: [] }
      const violations: ValidationViolation[] = result.violations || []
      
      return {
        isValid: result.is_valid,
        violations,
        hasErrors: violations.some(v => v.severity === 'error'),
        hasWarnings: violations.some(v => v.severity === 'warning'),
        weeklyHours: 0 // Would need separate query
      }
    } catch (err) {
      console.error('Validation exception:', err)
      return {
        isValid: true,
        violations: [],
        hasErrors: false,
        hasWarnings: false,
        weeklyHours: 0
      }
    }
  }
  
  /**
   * Get employee hours for the week
   */
  async function getEmployeeWeeklyHours(
    employeeId: string,
    weekStart: Date
  ): Promise<number> {
    try {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      const { data, error } = await supabase
        .from('shifts')
        .select('start_at, end_at')
        .eq('employee_id', employeeId)
        .gte('start_at', weekStart.toISOString())
        .lt('start_at', weekEnd.toISOString())
      
      if (error || !data) return 0
      
      return data.reduce((total, shift) => {
        if (!shift.start_at || !shift.end_at) return total
        const start = new Date(shift.start_at)
        const end = new Date(shift.end_at)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }, 0)
    } catch {
      return 0
    }
  }
  
  /**
   * Get hours summary for all employees in a week (for roster display)
   */
  async function getWeeklyHoursSummary(
    weekStart: Date,
    shifts: any[]
  ): Promise<Map<string, EmployeeHoursSummary>> {
    const summary = new Map<string, EmployeeHoursSummary>()
    
    for (const shift of shifts) {
      if (!shift.employee_id || !shift.start_at || !shift.end_at) continue
      
      const start = new Date(shift.start_at)
      const end = new Date(shift.end_at)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      
      const existing = summary.get(shift.employee_id)
      if (existing) {
        existing.scheduledHours += hours
        existing.shiftCount++
        existing.isOvertime = existing.scheduledHours > 40
        existing.isApproachingOvertime = existing.scheduledHours > 35
      } else {
        summary.set(shift.employee_id, {
          employeeId: shift.employee_id,
          firstName: shift.employees?.first_name || '',
          lastName: shift.employees?.last_name || '',
          scheduledHours: hours,
          isOvertime: hours > 40,
          isApproachingOvertime: hours > 35,
          shiftCount: 1
        })
      }
    }
    
    return summary
  }
  
  /**
   * Check if assignment should be blocked or just warned
   */
  function shouldBlockAssignment(violations: ValidationViolation[]): boolean {
    return violations.some(v => v.severity === 'error')
  }
  
  /**
   * Format violations for display
   */
  function formatViolations(violations: ValidationViolation[]): string {
    return violations.map(v => `${getSeverityEmoji(v.severity)} ${v.message}`).join('\n')
  }
  
  function getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'error': return '🚫'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '•'
    }
  }
  
  /**
   * Get violation color for UI
   */
  function getViolationColor(severity: string): string {
    switch (severity) {
      case 'error': return 'error'
      case 'warning': return 'warning'
      case 'info': return 'info'
      default: return 'grey'
    }
  }
  
  /**
   * Show validation toast based on violations
   */
  function showValidationToast(violations: ValidationViolation[], employeeName: string) {
    if (violations.length === 0) return
    
    const hasError = violations.some(v => v.severity === 'error')
    const messages = violations.map(v => v.message).join('; ')
    
    if (hasError) {
      toast.error(`Cannot assign ${employeeName}: ${messages}`)
    } else {
      toast.warning(`${employeeName}: ${messages}`)
    }
  }
  
  return {
    validateShiftAssignment,
    getEmployeeWeeklyHours,
    getWeeklyHoursSummary,
    shouldBlockAssignment,
    formatViolations,
    getViolationColor,
    showValidationToast,
    getSeverityEmoji
  }
}
