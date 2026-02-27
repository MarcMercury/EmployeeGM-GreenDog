/**
 * Payroll Store
 * Handles payroll calculation, adjustments, and approval workflow
 *
 * CA vet industry benchmarks (from ~/utils/vetBenchmarks.ts):
 * - Payroll costs target: 23-25% of revenue (AAHA/VHMA)
 * - CA overtime: daily >8h = 1.5×, >12h = 2×; weekly >40h (CA Labor Code § 510)
 * - CA healthcare worker minimum wage: $25/hr (SB 525)
 * - Salary divisor: 26 pay periods/year (bi-weekly)
 * - Staff-to-vet ratio: 4:1 to 5:1 optimal for productivity
 */
import { defineStore } from 'pinia'
import { format, differenceInMinutes, parseISO, startOfWeek, addDays } from 'date-fns'
import type { PayrollEmployee, PayrollTimeEntry, PayrollAdjustment, PayrollSignoff, PayrollStats } from '~/types/operations.types'
import { calculateCaliforniaOT } from '~/utils/overtimeCalculation'
import type { DailyHoursMap } from '~/utils/overtimeCalculation'
export type { PayrollEmployee, PayrollTimeEntry, PayrollAdjustment, PayrollSignoff, PayrollStats }

interface PayrollState {
  // Period selection
  periodStart: string
  periodEnd: string
  
  // Data
  employees: PayrollEmployee[]
  loading: boolean
  error: string | null
  
  // Selected employee for detail view
  selectedEmployeeId: string | null
  selectedEmployeeTimecard: PayrollTimeEntry[]
  selectedEmployeeAdjustments: PayrollAdjustment[]
  selectedEmployeeSignoff: PayrollSignoff | null
  loadingDetail: boolean
  
  // Stats
  stats: PayrollStats
}

export const usePayrollStore = defineStore('payroll', {
  state: (): PayrollState => {
    // Default to last 2 weeks
    const today = new Date()
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(today.getDate() - 14)
    
    // Align to Sunday (typical pay period start)
    const periodStart = startOfWeek(twoWeeksAgo, { weekStartsOn: 0 })
    const periodEnd = addDays(periodStart, 13)
    
    return {
      periodStart: format(periodStart, 'yyyy-MM-dd'),
      periodEnd: format(periodEnd, 'yyyy-MM-dd'),
      employees: [],
      loading: false,
      error: null,
      selectedEmployeeId: null,
      selectedEmployeeTimecard: [],
      selectedEmployeeAdjustments: [],
      selectedEmployeeSignoff: null,
      loadingDetail: false,
      stats: {
        totalPayroll: 0,
        pendingReviews: 0,
        approvedCount: 0,
        missingPunches: 0,
        totalEmployees: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalPTOHours: 0
      }
    }
  },
  
  getters: {
    // Filter employees by status
    pendingEmployees: (state) => state.employees.filter(e => e.status === 'pending'),
    approvedEmployees: (state) => state.employees.filter(e => e.status === 'approved'),
    employeesWithIssues: (state) => state.employees.filter(e => e.has_issues),
    
    // Get selected employee data
    selectedEmployee: (state) => {
      if (!state.selectedEmployeeId) return null
      return state.employees.find(e => e.employee_id === state.selectedEmployeeId)
    },
    
    // Calculate totals from selected employee's corrected timecard
    selectedEmployeeTotals: (state) => {
      if (!state.selectedEmployeeTimecard.length) {
        return { regular: 0, overtime: 0, doubleTime: 0, total: 0 }
      }
      
      // Group entries by day
      const dailyHours: DailyHoursMap = {}
      state.selectedEmployeeTimecard.forEach(entry => {
        const day = entry.entry_date
        const hours = entry.total_hours || 0
        dailyHours[day] = (dailyHours[day] || 0) + hours
      })
      
      // Calculate OT using shared California rules utility
      return calculateCaliforniaOT(dailyHours)
    },
    
    // Calculate gross pay for selected employee
    selectedEmployeeGrossPay(state): number {
      const employee = state.employees.find(e => e.employee_id === state.selectedEmployeeId)
      if (!employee) return 0
      
      const rate = employee.pay_rate || 0
      // Use `this` instead of re-entering the store via usePayrollStore() to avoid
      // recursive getter invocation and potential infinite reactivity loops.
      const totals = this.selectedEmployeeTotals
      const adjustments = state.selectedEmployeeAdjustments.reduce((sum, adj) => {
        return sum + (adj.type === 'deduction' ? -adj.amount : adj.amount)
      }, 0)
      
      if (employee.pay_type === 'Salary') {
        // Bi-weekly salary
        return (rate / 26) + adjustments
      }
      
      // Hourly calculation
      return (totals.regular * rate) +
             (totals.overtime * rate * 1.5) +
             (totals.doubleTime * rate * 2.0) +
             adjustments
    },
    
    // Check if all employees are approved for export
    allApproved: (state) => state.employees.every(e => e.status === 'approved'),
    unapprovedCount: (state) => state.employees.filter(e => e.status !== 'approved').length
  },
  
  actions: {
    /**
     * Set the pay period date range
     */
    setPeriod(startDate: string, endDate: string) {
      this.periodStart = startDate
      this.periodEnd = endDate
    },
    
    /**
     * Fetch payroll summary for all employees
     * Restricted to admin/hr roles — payroll data is sensitive.
     */
    async fetchPayrollSummary() {
      // Guard: only admin, hr_admin, super_admin can access payroll data
      const authStore = useAuthStore()
      const allowedRoles = ['super_admin', 'admin', 'hr_admin']
      if (!authStore.profile || !allowedRoles.includes(authStore.profile.role || '')) {
        this.error = 'Insufficient permissions to view payroll data'
        return
      }

      this.loading = true
      this.error = null
      
      const supabase = useSupabaseClient()
      
      try {
        // Try to use the database function first
        const { data, error } = await supabase
          .rpc('get_payroll_summary', {
            p_start_date: this.periodStart,
            p_end_date: this.periodEnd
          })
        
        if (error) throw error
        
        this.employees = (data || []).map((row: any) => ({
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          department_name: row.department_name,
          pay_rate: row.pay_rate || 0,
          pay_type: row.pay_type || 'Hourly',
          regular_hours: row.regular_hours || 0,
          overtime_hours: row.overtime_hours || 0,
          double_time_hours: row.double_time_hours || 0,
          pto_hours: row.pto_hours || 0,
          adjustments_total: row.adjustments_total || 0,
          gross_pay_estimate: row.gross_pay_estimate || 0,
          status: row.status || 'pending',
          has_issues: row.has_issues || false,
          issue_details: row.issue_details
        }))
        
        // Calculate stats
        this.calculateStats()
        
      } catch (err: unknown) {
        console.warn('[Payroll] Database function not available, using fallback:', err)
        
        // Fallback: manual query
        await this.fetchPayrollSummaryFallback()
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Fallback method if database function isn't available
     * Restricted to admin/hr roles — payroll data is sensitive.
     */
    async fetchPayrollSummaryFallback() {
      // Guard: only admin, hr_admin, super_admin can access payroll data
      const authStore = useAuthStore()
      const allowedRoles = ['super_admin', 'admin', 'hr_admin']
      if (!authStore.profile || !allowedRoles.includes(authStore.profile.role || '')) {
        this.error = 'Insufficient permissions to view payroll data'
        return
      }

      const supabase = useSupabaseClient()
      
      try {
        this.error = null
        // Get all active employees with compensation
        const { data: employees } = await supabase
          .from('employees')
          .select(`
            id,
            first_name,
            last_name,
            department:departments(name),
            compensation:employee_compensation(pay_type, pay_rate)
          `)
          .eq('employment_status', 'active')
        
        // Get time entries for period
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('employee_id, clock_in_at, clock_out_at, total_hours')
          .gte('clock_in_at', `${this.periodStart}T00:00:00`)
          .lte('clock_in_at', `${this.periodEnd}T23:59:59`)
        
        // Get approved PTO for period
        const { data: ptoRequests } = await supabase
          .from('time_off_requests')
          .select('employee_id, duration_hours')
          .eq('status', 'approved')
          .lte('start_date', this.periodEnd)
          .gte('end_date', this.periodStart)
        
        // Get adjustments for period
        const { data: adjustments } = await supabase
          .from('payroll_adjustments')
          .select('*')
          .eq('pay_period_start', this.periodStart)
          .eq('pay_period_end', this.periodEnd)
        
        // Get signoffs for period
        const { data: signoffs } = await supabase
          .from('payroll_signoffs')
          .select('*')
          .eq('pay_period_start', this.periodStart)
          .eq('pay_period_end', this.periodEnd)
        
        // Process each employee
        this.employees = (employees || []).map((emp: any) => {
          const empEntries = (timeEntries || []).filter(e => e.employee_id === emp.id)
          const empPTO = (ptoRequests || []).filter(p => p.employee_id === emp.id)
          const empAdj = (adjustments || []).filter(a => a.employee_id === emp.id)
          const empSignoff = (signoffs || []).find(s => s.employee_id === emp.id)
          
          // Calculate hours with OT
          const hoursByDay: Record<string, number> = {}
          let hasMissingPunch = false
          
          empEntries.forEach((entry: any) => {
            if (!entry.clock_out_at || entry.total_hours === null) {
              hasMissingPunch = true
            }
            const day = entry.clock_in_at?.split('T')[0]
            if (day && entry.total_hours) {
              hoursByDay[day] = (hoursByDay[day] || 0) + entry.total_hours
            }
          })
          
          // California OT calculation (shared utility)
          const otResult = calculateCaliforniaOT(hoursByDay)
          const regularHours = otResult.regular
          const overtimeHours = otResult.overtime
          const doubleTimeHours = otResult.doubleTime
          
          const ptoHours = empPTO.reduce((sum: number, p: any) => sum + (p.duration_hours || 0), 0)
          const adjTotal = empAdj.reduce((sum: number, a: any) => {
            return sum + (a.type === 'deduction' ? -a.amount : a.amount)
          }, 0)
          
          const payRate = emp.compensation?.pay_rate || 0
          const payType = emp.compensation?.pay_type || 'Hourly'
          
          let grossPay = 0
          if (payType === 'Salary') {
            grossPay = (payRate / 26) + adjTotal
          } else {
            grossPay = (regularHours * payRate) +
                       (overtimeHours * payRate * 1.5) +
                       (doubleTimeHours * payRate * 2.0) +
                       (ptoHours * payRate) +
                       adjTotal
          }
          
          return {
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            department_name: emp.department?.name || null,
            pay_rate: payRate,
            pay_type: payType,
            regular_hours: Math.round(regularHours * 100) / 100,
            overtime_hours: Math.round(overtimeHours * 100) / 100,
            double_time_hours: Math.round(doubleTimeHours * 100) / 100,
            pto_hours: ptoHours,
            adjustments_total: adjTotal,
            gross_pay_estimate: Math.round(grossPay * 100) / 100,
            status: empSignoff?.status || 'pending',
            has_issues: hasMissingPunch,
            issue_details: hasMissingPunch ? 'Missing clock-out' : null
          }
        })
        
        this.calculateStats()
        
      } catch (err: unknown) {
        console.error('[Payroll] Error fetching payroll data:', err)
        this.error = err instanceof Error ? err.message : 'Failed to load payroll data'
      }
    },
    
    /**
     * Calculate summary stats
     */
    calculateStats() {
      this.stats = {
        totalPayroll: this.employees.reduce((sum, e) => sum + e.gross_pay_estimate, 0),
        pendingReviews: this.employees.filter(e => e.status === 'pending').length,
        approvedCount: this.employees.filter(e => e.status === 'approved').length,
        missingPunches: this.employees.filter(e => e.has_issues).length,
        totalEmployees: this.employees.length,
        totalRegularHours: this.employees.reduce((sum, e) => sum + e.regular_hours, 0),
        totalOvertimeHours: this.employees.reduce((sum, e) => sum + e.overtime_hours + e.double_time_hours, 0),
        totalPTOHours: this.employees.reduce((sum, e) => sum + e.pto_hours, 0)
      }
    },
    
    /**
     * Select an employee and load their detail data
     */
    async selectEmployee(employeeId: string) {
      this.selectedEmployeeId = employeeId
      this.loadingDetail = true
      
      const supabase = useSupabaseClient()
      
      try {
        // Load timecard
        await this.loadEmployeeTimecard(employeeId)
        
        // Load adjustments
        const { data: adjustments } = await supabase
          .from('payroll_adjustments')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('pay_period_start', this.periodStart)
          .eq('pay_period_end', this.periodEnd)
          .order('created_at', { ascending: false })
        
        this.selectedEmployeeAdjustments = adjustments || []
        
        // Load signoff status
        const { data: signoff } = await supabase
          .from('payroll_signoffs')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('pay_period_start', this.periodStart)
          .eq('pay_period_end', this.periodEnd)
          .maybeSingle()
        
        this.selectedEmployeeSignoff = signoff
        
      } catch (err: unknown) {
        console.error('[Payroll] Error loading employee detail:', err)
      } finally {
        this.loadingDetail = false
      }
    },
    
    /**
     * Load employee timecard entries
     */
    async loadEmployeeTimecard(employeeId: string) {
      const supabase = useSupabaseClient()
      
      try {
        // Try database function first
        const { data, error } = await supabase
          .rpc('get_employee_timecard', {
            p_employee_id: employeeId,
            p_start_date: this.periodStart,
            p_end_date: this.periodEnd
          })
        
        if (error) throw error
        this.selectedEmployeeTimecard = data || []
        
      } catch (err) {
        // Fallback to direct query
        const { data } = await supabase
          .from('time_entries')
          .select(`
            id,
            shift_id,
            clock_in_at,
            clock_out_at,
            total_hours
          `)
          .eq('employee_id', employeeId)
          .gte('clock_in_at', `${this.periodStart}T00:00:00`)
          .lte('clock_in_at', `${this.periodEnd}T23:59:59`)
          .order('clock_in_at', { ascending: true })
        
        this.selectedEmployeeTimecard = (data || []).map((entry: any) => ({
          entry_id: entry.id,
          shift_id: entry.shift_id,
          entry_date: entry.clock_in_at?.split('T')[0],
          clock_in_at: entry.clock_in_at,
          clock_out_at: entry.clock_out_at,
          original_clock_in: entry.clock_in_at,
          original_clock_out: entry.clock_out_at,
          total_hours: entry.total_hours,
          is_corrected: false,
          correction_reason: null,
          has_issue: !entry.clock_out_at || entry.total_hours === null || entry.total_hours < 0,
          issue_type: !entry.clock_out_at ? 'missing_clock_out' : 
                     entry.total_hours === null ? 'missing_hours' :
                     entry.total_hours < 0 ? 'negative_hours' : null
        }))
      }
    },
    
    /**
     * Correct a time entry
     */
    async correctTimeEntry(
      entryId: string,
      clockIn: string,
      clockOut: string,
      reason: string
    ) {
      const supabase = useSupabaseClient()
      const userStore = useUserStore()
      
      // Calculate new total hours
      const inTime = new Date(clockIn)
      const outTime = new Date(clockOut)
      const totalHours = differenceInMinutes(outTime, inTime) / 60
      
      if (totalHours < 0) {
        throw new Error('Clock-out must be after clock-in')
      }
      
      // Find original entry
      const entry = this.selectedEmployeeTimecard.find(e => e.entry_id === entryId)
      if (!entry) throw new Error('Entry not found')
      
      try {
        // Save correction
        const { error } = await supabase
          .from('time_entry_corrections')
          .upsert({
            time_entry_id: entryId,
            pay_period_start: this.periodStart,
            pay_period_end: this.periodEnd,
            original_clock_in: entry.original_clock_in,
            original_clock_out: entry.original_clock_out,
            corrected_clock_in: clockIn,
            corrected_clock_out: clockOut,
            corrected_total_hours: Math.round(totalHours * 100) / 100,
            correction_reason: reason,
            corrected_by: userStore.employee?.id
          }, {
            onConflict: 'time_entry_id,pay_period_start,pay_period_end'
          })
        
        if (error) throw error
        
        // Update local state
        const idx = this.selectedEmployeeTimecard.findIndex(e => e.entry_id === entryId)
        if (idx >= 0) {
          this.selectedEmployeeTimecard[idx] = {
            ...this.selectedEmployeeTimecard[idx],
            clock_in_at: clockIn,
            clock_out_at: clockOut,
            total_hours: Math.round(totalHours * 100) / 100,
            is_corrected: true,
            correction_reason: reason,
            has_issue: false,
            issue_type: null
          }
        }
        
        return true
      } catch (err: unknown) {
        console.error('[Payroll] Error correcting time entry:', err)
        throw err
      }
    },
    
    /**
     * Add a payroll adjustment (bonus, reimbursement, etc.)
     */
    async addAdjustment(
      employeeId: string,
      type: PayrollAdjustment['type'],
      amount: number,
      note: string
    ) {
      // Guard: only admin/hr roles can add payroll adjustments
      const authStore = useAuthStore()
      const allowedRoles = ['super_admin', 'admin', 'hr_admin']
      if (!authStore.profile || !allowedRoles.includes(authStore.profile.role || '')) {
        throw new Error('Insufficient permissions to add payroll adjustments')
      }

      const supabase = useSupabaseClient()
      const userStore = useUserStore()
      
      try {
        const { data, error } = await supabase
          .from('payroll_adjustments')
          .insert({
            employee_id: employeeId,
            pay_period_start: this.periodStart,
            pay_period_end: this.periodEnd,
            type,
            amount,
            note,
            created_by: userStore.employee?.id
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Update local state
        this.selectedEmployeeAdjustments.unshift(data)
        
        // Update employee totals
        const empIdx = this.employees.findIndex(e => e.employee_id === employeeId)
        if (empIdx >= 0) {
          const adj = type === 'deduction' ? -amount : amount
          this.employees[empIdx].adjustments_total += adj
          this.employees[empIdx].gross_pay_estimate += adj
        }
        
        this.calculateStats()
        return data
        
      } catch (err: unknown) {
        console.error('[Payroll] Error adding adjustment:', err)
        throw err
      }
    },
    
    /**
     * Remove a payroll adjustment
     */
    async removeAdjustment(adjustmentId: string) {
      // Guard: only admin/hr roles can remove payroll adjustments
      const authStore = useAuthStore()
      const allowedRoles = ['super_admin', 'admin', 'hr_admin']
      if (!authStore.profile || !allowedRoles.includes(authStore.profile.role || '')) {
        throw new Error('Insufficient permissions to remove payroll adjustments')
      }

      const supabase = useSupabaseClient()
      
      const adj = this.selectedEmployeeAdjustments.find(a => a.id === adjustmentId)
      if (!adj) return
      
      try {
        const { error } = await supabase
          .from('payroll_adjustments')
          .delete()
          .eq('id', adjustmentId)
        
        if (error) throw error
        
        // Update local state
        this.selectedEmployeeAdjustments = this.selectedEmployeeAdjustments.filter(
          a => a.id !== adjustmentId
        )
        
        // Update employee totals
        const empIdx = this.employees.findIndex(e => e.employee_id === adj.employee_id)
        if (empIdx >= 0) {
          const adjAmount = adj.type === 'deduction' ? -adj.amount : adj.amount
          this.employees[empIdx].adjustments_total -= adjAmount
          this.employees[empIdx].gross_pay_estimate -= adjAmount
        }
        
        this.calculateStats()
        
      } catch (err: unknown) {
        console.error('[Payroll] Error removing adjustment:', err)
        throw err
      }
    },
    
    /**
     * Approve an employee's payroll for the period
     */
    async approvePayroll(employeeId: string, notes?: string) {
      // Guard: only admin/hr roles can approve payroll
      const authStore = useAuthStore()
      const allowedRoles = ['super_admin', 'admin', 'hr_admin']
      if (!authStore.profile || !allowedRoles.includes(authStore.profile.role || '')) {
        throw new Error('Insufficient permissions to approve payroll')
      }

      const supabase = useSupabaseClient()
      const userStore = useUserStore()
      
      const employee = this.employees.find(e => e.employee_id === employeeId)
      if (!employee) throw new Error('Employee not found')
      
      try {
        const { data, error } = await supabase
          .from('payroll_signoffs')
          .upsert({
            employee_id: employeeId,
            pay_period_start: this.periodStart,
            pay_period_end: this.periodEnd,
            status: 'approved',
            regular_hours: employee.regular_hours,
            overtime_hours: employee.overtime_hours,
            double_time_hours: employee.double_time_hours,
            pto_hours: employee.pto_hours,
            total_adjustments: employee.adjustments_total,
            gross_pay_estimate: employee.gross_pay_estimate,
            has_missing_punches: employee.has_issues,
            requires_attention: false,
            approved_by: userStore.employee?.id,
            approved_at: new Date().toISOString(),
            reviewed_by: userStore.employee?.id,
            reviewed_at: new Date().toISOString(),
            reviewer_notes: notes
          }, {
            onConflict: 'employee_id,pay_period_start,pay_period_end'
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Update local state
        const idx = this.employees.findIndex(e => e.employee_id === employeeId)
        if (idx >= 0) {
          this.employees[idx].status = 'approved'
        }
        
        this.selectedEmployeeSignoff = data
        this.calculateStats()
        
        return data
        
      } catch (err: unknown) {
        console.error('[Payroll] Error approving payroll:', err)
        throw err
      }
    },
    
    /**
     * Flag an employee's payroll as needing review
     */
    async flagForReview(employeeId: string, reason: string) {
      const supabase = useSupabaseClient()
      const userStore = useUserStore()
      
      try {
        const { data, error } = await supabase
          .from('payroll_signoffs')
          .upsert({
            employee_id: employeeId,
            pay_period_start: this.periodStart,
            pay_period_end: this.periodEnd,
            status: 'needs_review',
            requires_attention: true,
            attention_reason: reason,
            reviewed_by: userStore.employee?.id,
            reviewed_at: new Date().toISOString()
          }, {
            onConflict: 'employee_id,pay_period_start,pay_period_end'
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Update local state
        const idx = this.employees.findIndex(e => e.employee_id === employeeId)
        if (idx >= 0) {
          this.employees[idx].status = 'needs_review'
          this.employees[idx].has_issues = true
          this.employees[idx].issue_details = reason
        }
        
        this.selectedEmployeeSignoff = data
        this.calculateStats()
        
        return data
        
      } catch (err: unknown) {
        console.error('[Payroll] Error flagging for review:', err)
        throw err
      }
    },
    
    /**
     * Clear selected employee
     */
    clearSelection() {
      this.selectedEmployeeId = null
      this.selectedEmployeeTimecard = []
      this.selectedEmployeeAdjustments = []
      this.selectedEmployeeSignoff = null
    },
    
    /**
     * Get export data with all adjustments applied
     */
    getExportData() {
      return this.employees.map(emp => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        department: emp.department_name || '',
        pay_type: emp.pay_type,
        pay_rate: emp.pay_rate,
        regular_hours: emp.regular_hours,
        overtime_hours: emp.overtime_hours,
        double_time_hours: emp.double_time_hours,
        pto_hours: emp.pto_hours,
        adjustments: emp.adjustments_total,
        gross_pay: emp.gross_pay_estimate,
        status: emp.status
      }))
    }
  }
})
