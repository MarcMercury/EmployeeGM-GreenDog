/**
 * Composable for attendance data management
 * Handles attendance records, reliability scoring, and excused status conversions
 */

import type { AttendanceBreakdown } from '~/types/operations.types'
import type { AttendanceDetailRecord as AttendanceRecord, AttendanceBreakdownStats as AttendanceStats } from '~/types'

export function useAttendance() {
  const supabase = useSupabaseClient()
  
  /**
   * Get the reliability score for an employee using weighted penalties
   * @param employeeId - The employee's UUID
   * @param lookbackDays - Number of days to look back (default 90)
   */
  async function getReliabilityScore(employeeId: string, lookbackDays: number = 90): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_reliability_score', {
          p_employee_id: employeeId,
          p_lookback_days: lookbackDays
        })
      
      if (error) throw error
      return data ?? 100
    } catch (err) {
      console.error('[useAttendance] Error calculating reliability score:', err)
      // Fallback: calculate from raw data
      return await calculateReliabilityScoreFallback(employeeId, lookbackDays)
    }
  }
  
  /**
   * Fallback reliability score calculation using shifts and time entries
   * Used when the database function isn't available or fails
   */
  async function calculateReliabilityScoreFallback(
    employeeId: string, 
    lookbackDays: number = 90
  ): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
    
    // Try to get from attendance table first
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('status, penalty_weight')
      .eq('employee_id', employeeId)
      .gte('shift_date', cutoffDate.toISOString().split('T')[0])
    
    if (attendanceRecords && attendanceRecords.length > 0) {
      const totalPenalty = attendanceRecords.reduce((sum, r) => sum + (r.penalty_weight || 0), 0)
      const score = Math.round(100 - (totalPenalty / attendanceRecords.length * 100))
      return Math.max(0, Math.min(100, score))
    }
    
    // Fallback to legacy calculation from shifts/time_entries
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, start_at')
      .eq('employee_id', employeeId)
      .eq('status', 'completed')
      .gte('start_at', cutoffDate.toISOString())
    
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, clock_in_at, shift_id')
      .eq('employee_id', employeeId)
      .not('clock_in_at', 'is', null)
    
    const totalShifts = shifts?.length || 0
    if (totalShifts === 0) return 100
    
    const GRACE_PERIOD_MINUTES = 5
    let onTimeCount = 0
    
    shifts?.forEach(shift => {
      const entry = entries?.find(e => e.shift_id === shift.id)
      if (entry && entry.clock_in_at) {
        const shiftStart = new Date(shift.start_at)
        const clockIn = new Date(entry.clock_in_at)
        const diffMinutes = (clockIn.getTime() - shiftStart.getTime()) / 60000
        if (diffMinutes <= GRACE_PERIOD_MINUTES) onTimeCount++
      }
    })
    
    return Math.round((onTimeCount / totalShifts) * 100)
  }
  
  /**
   * Get attendance breakdown by status
   * @param employeeId - The employee's UUID
   * @param lookbackDays - Number of days to look back (default 90)
   */
  async function getAttendanceBreakdown(
    employeeId: string, 
    lookbackDays: number = 90
  ): Promise<AttendanceStats> {
    const stats: AttendanceStats = {
      present: 0,
      late: 0,
      excused_late: 0,
      absent: 0,
      excused_absent: 0,
      no_show: 0,
      total: 0,
      reliabilityScore: 100
    }
    
    try {
      // Try database function first
      const { data, error } = await supabase
        .rpc('get_attendance_breakdown', {
          p_employee_id: employeeId,
          p_lookback_days: lookbackDays
        })
      
      if (error) throw error
      
      if (data) {
        data.forEach((row: AttendanceBreakdown) => {
          const key = row.status as keyof Omit<AttendanceStats, 'total' | 'reliabilityScore'>
          if (key in stats) {
            stats[key] = row.count
          }
          stats.total += row.count
        })
      }
      
      stats.reliabilityScore = await getReliabilityScore(employeeId, lookbackDays)
      
    } catch (err) {
      console.warn('[useAttendance] Falling back to direct query:', err)
      
      // Fallback: direct query
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
      
      const { data: records } = await supabase
        .from('attendance')
        .select('status')
        .eq('employee_id', employeeId)
        .gte('shift_date', cutoffDate.toISOString().split('T')[0])
      
      if (records) {
        records.forEach(r => {
          const key = r.status as keyof Omit<AttendanceStats, 'total' | 'reliabilityScore'>
          if (key in stats) {
            stats[key]++
          }
          stats.total++
        })
      }
      
      stats.reliabilityScore = await calculateReliabilityScoreFallback(employeeId, lookbackDays)
    }
    
    return stats
  }
  
  /**
   * Get detailed attendance records for a specific status
   * Used for the drill-down modal when clicking on stats
   */
  async function getAttendanceByStatus(
    employeeId: string,
    status: string,
    lookbackDays: number = 90
  ): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_attendance_by_status', {
          p_employee_id: employeeId,
          p_status: status,
          p_lookback_days: lookbackDays
        })
      
      if (error) throw error
      return data || []
      
    } catch (err) {
      console.warn('[useAttendance] Falling back to direct query for status details:', err)
      
      // Fallback: direct query
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
      
      const { data } = await supabase
        .from('attendance')
        .select(`
          id,
          shift_date,
          scheduled_start,
          actual_start,
          minutes_late,
          notes,
          excuse_reason,
          excused_at,
          excused_by:employees!attendance_excused_by_employee_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('employee_id', employeeId)
        .eq('status', status)
        .gte('shift_date', cutoffDate.toISOString().split('T')[0])
        .order('shift_date', { ascending: false })
      
      return (data || []).map(r => ({
        id: r.id,
        shift_date: r.shift_date,
        scheduled_start: r.scheduled_start,
        actual_start: r.actual_start,
        minutes_late: r.minutes_late,
        notes: r.notes,
        excuse_reason: r.excuse_reason,
        excused_at: r.excused_at,
        excused_by_name: r.excused_by 
          ? `${r.excused_by.first_name} ${r.excused_by.last_name}` 
          : null
      }))
    }
  }
  
  /**
   * Get all attendance records for an employee (for history view)
   */
  async function getAttendanceHistory(
    employeeId: string,
    lookbackDays: number = 90
  ): Promise<any[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
    
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        shift:shifts(
          id,
          start_at,
          end_at,
          location:locations(name)
        ),
        excused_by:employees!attendance_excused_by_employee_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('employee_id', employeeId)
      .gte('shift_date', cutoffDate.toISOString().split('T')[0])
      .order('shift_date', { ascending: false })
    
    if (error) {
      console.error('[useAttendance] Error fetching attendance history:', error)
      return []
    }
    
    return data || []
  }
  
  /**
   * Convert an attendance record to excused status
   * Only callable by admins, managers, and hr_admin
   */
  async function convertToExcused(
    attendanceId: string,
    excusingEmployeeId: string,
    excuseReason: string
  ): Promise<{ success: boolean; error?: string; record?: unknown }> {
    if (!excuseReason?.trim()) {
      return { success: false, error: 'Excuse reason is required' }
    }
    
    try {
      const { data, error } = await supabase
        .rpc('convert_to_excused', {
          p_attendance_id: attendanceId,
          p_excusing_employee_id: excusingEmployeeId,
          p_excuse_reason: excuseReason.trim()
        })
      
      if (error) throw error
      
      return { success: true, record: data }
      
    } catch (err: unknown) {
      console.error('[useAttendance] Error converting to excused:', err)
      
      // Fallback: direct update
      try {
        // Get current record to determine new status
        const { data: current } = await supabase
          .from('attendance')
          .select('status')
          .eq('id', attendanceId)
          .single()
        
        if (!current) {
          return { success: false, error: 'Attendance record not found' }
        }
        
        let newStatus = current.status
        if (current.status === 'late') newStatus = 'excused_late'
        else if (current.status === 'absent' || current.status === 'no_show') newStatus = 'excused_absent'
        
        const { data: updated, error: updateError } = await supabase
          .from('attendance')
          .update({
            status: newStatus,
            excused_at: new Date().toISOString(),
            excused_by_employee_id: excusingEmployeeId,
            excuse_reason: excuseReason.trim()
          })
          .eq('id', attendanceId)
          .select()
          .single()
        
        if (updateError) throw updateError
        
        return { success: true, record: updated }
        
      } catch (fallbackErr: unknown) {
        return { 
          success: false, 
          error: fallbackErr instanceof Error ? fallbackErr.message : 'Failed to update attendance record' 
        }
      }
    }
  }
  
  /**
   * Sync attendance record from a completed shift
   */
  async function syncAttendanceFromShift(shiftId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('sync_attendance_from_shift', {
          p_shift_id: shiftId
        })
      
      if (error) throw error
      return data
      
    } catch (err) {
      console.error('[useAttendance] Error syncing attendance from shift:', err)
      throw err
    }
  }
  
  /**
   * Get status display info (label, color, icon)
   */
  function getStatusInfo(status: string): { label: string; color: string; icon: string } {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      present: { label: 'On Time', color: 'success', icon: 'mdi-check-circle' },
      late: { label: 'Late', color: 'warning', icon: 'mdi-clock-alert' },
      excused_late: { label: 'Excused Late', color: 'info', icon: 'mdi-clock-check' },
      absent: { label: 'Absent', color: 'error', icon: 'mdi-account-off' },
      excused_absent: { label: 'Excused Absent', color: 'grey', icon: 'mdi-account-check' },
      no_show: { label: 'No Show', color: 'error', icon: 'mdi-account-remove' }
    }
    
    return statusMap[status] || { label: status, color: 'grey', icon: 'mdi-help-circle' }
  }
  
  /**
   * Check if a status can be converted to excused
   */
  function canBeExcused(status: string): boolean {
    return ['late', 'absent', 'no_show'].includes(status)
  }
  
  /**
   * Get penalty weight description
   */
  function getPenaltyDescription(status: string): string {
    const descriptions: Record<string, string> = {
      present: 'No impact on reliability score',
      late: 'Full impact on reliability score (100%)',
      excused_late: 'Reduced impact on reliability score (25%)',
      absent: 'Full impact on reliability score (100%)',
      excused_absent: 'Reduced impact on reliability score (25%)',
      no_show: 'Full impact on reliability score (100%)'
    }
    
    return descriptions[status] || 'Unknown impact'
  }
  
  return {
    getReliabilityScore,
    getAttendanceBreakdown,
    getAttendanceByStatus,
    getAttendanceHistory,
    convertToExcused,
    syncAttendanceFromShift,
    getStatusInfo,
    canBeExcused,
    getPenaltyDescription
  }
}
