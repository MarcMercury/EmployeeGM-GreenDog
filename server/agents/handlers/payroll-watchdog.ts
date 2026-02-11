/**
 * Agent B4: Payroll Watchdog
 *
 * Pre-payroll anomaly detection. Scans time entries for missing punches,
 * overtime risk, >12h shifts, unapproved entries, and duplicate records.
 * Pure SQL/logic — no LLM calls needed.
 *
 * Reads: time_entries, time_punches, shifts, employees
 * Writes: agent_proposals (payroll_anomaly type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const MAX_SHIFT_HOURS = 12
const OVERTIME_THRESHOLD = 40
const OVERTIME_WARNING_THRESHOLD = 36 // Warn when approaching overtime

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting payroll watchdog scan`, 'agent', { runId })

  // 1. Determine the current pay period (this week Mon-Sun)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString()
  const weekStartDate = monday.toISOString().split('T')[0]

  // 2. Get all time entries for this week
  const { data: entries, error: entErr } = await supabase
    .from('time_entries')
    .select('id, employee_id, shift_id, clock_in_at, clock_out_at, total_hours, is_approved, correction_reason')
    .gte('clock_in_at', weekStart)
    .order('clock_in_at', { ascending: true })

  if (entErr) {
    throw new Error(`Failed to fetch time entries: ${entErr.message}`)
  }

  // 3. Get employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employment_type')
    .eq('employment_status', 'active')

  const empMap = new Map<string, any>()
  for (const emp of (employees ?? [])) {
    empMap.set(emp.id, emp)
  }

  // 4. Analyze entries per employee
  const empEntries = new Map<string, any[]>()
  for (const entry of (entries ?? [])) {
    if (!empEntries.has(entry.employee_id)) empEntries.set(entry.employee_id, [])
    empEntries.get(entry.employee_id)!.push(entry)
  }

  // Types of anomalies
  interface Anomaly {
    type: 'missing_clock_out' | 'long_shift' | 'overtime_risk' | 'overtime' | 'unapproved' | 'duplicate'
    severity: 'low' | 'medium' | 'high'
    employee_id: string
    employee_name: string
    description: string
    entry_id?: string
    hours?: number
  }

  const anomalies: Anomaly[] = []

  for (const [empId, entryList] of empEntries) {
    const emp = empMap.get(empId)
    if (!emp) continue
    const name = `${emp.first_name} ${emp.last_name}`

    let weeklyHours = 0
    let unapprovedCount = 0

    for (const entry of entryList) {
      // Check: Missing clock-out
      if (entry.clock_in_at && !entry.clock_out_at) {
        anomalies.push({
          type: 'missing_clock_out',
          severity: 'high',
          employee_id: empId,
          employee_name: name,
          description: `Missing clock-out for entry starting ${new Date(entry.clock_in_at).toLocaleString()}`,
          entry_id: entry.id,
        })
        continue
      }

      // Calculate shift duration
      const hours = entry.total_hours ?? (
        (new Date(entry.clock_out_at).getTime() - new Date(entry.clock_in_at).getTime()) / (1000 * 60 * 60)
      )
      weeklyHours += hours

      // Check: Long shift (>12h)
      if (hours > MAX_SHIFT_HOURS) {
        anomalies.push({
          type: 'long_shift',
          severity: 'medium',
          employee_id: empId,
          employee_name: name,
          description: `${hours.toFixed(1)}h shift on ${new Date(entry.clock_in_at).toLocaleDateString()} exceeds ${MAX_SHIFT_HOURS}h maximum`,
          entry_id: entry.id,
          hours,
        })
      }

      // Check: Unapproved entries
      if (!entry.is_approved) {
        unapprovedCount++
      }
    }

    // Check: Overtime / approaching overtime
    if (weeklyHours > OVERTIME_THRESHOLD) {
      anomalies.push({
        type: 'overtime',
        severity: 'high',
        employee_id: empId,
        employee_name: name,
        description: `${weeklyHours.toFixed(1)}h this week — exceeds ${OVERTIME_THRESHOLD}h overtime threshold`,
        hours: weeklyHours,
      })
    } else if (weeklyHours > OVERTIME_WARNING_THRESHOLD) {
      anomalies.push({
        type: 'overtime_risk',
        severity: 'medium',
        employee_id: empId,
        employee_name: name,
        description: `${weeklyHours.toFixed(1)}h so far — approaching ${OVERTIME_THRESHOLD}h overtime threshold`,
        hours: weeklyHours,
      })
    }

    // Check: Unapproved entries
    if (unapprovedCount > 0) {
      anomalies.push({
        type: 'unapproved',
        severity: unapprovedCount >= 3 ? 'medium' : 'low',
        employee_id: empId,
        employee_name: name,
        description: `${unapprovedCount} unapproved time entries this week`,
      })
    }

    // Check: Duplicate entries (same employee, overlapping times)
    for (let i = 0; i < entryList.length - 1; i++) {
      for (let j = i + 1; j < entryList.length; j++) {
        const a = entryList[i]
        const b = entryList[j]
        if (!a.clock_in_at || !b.clock_in_at || !a.clock_out_at || !b.clock_out_at) continue

        const aStart = new Date(a.clock_in_at).getTime()
        const aEnd = new Date(a.clock_out_at).getTime()
        const bStart = new Date(b.clock_in_at).getTime()
        const bEnd = new Date(b.clock_out_at).getTime()

        // Check overlap
        if (aStart < bEnd && bStart < aEnd) {
          anomalies.push({
            type: 'duplicate',
            severity: 'high',
            employee_id: empId,
            employee_name: name,
            description: `Overlapping time entries: ${new Date(a.clock_in_at).toLocaleString()} and ${new Date(b.clock_in_at).toLocaleString()}`,
            entry_id: a.id,
          })
        }
      }
    }
  }

  // 5. Create proposals for anomalies
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  if (anomalies.length > 0) {
    // Group by severity for individual high-severity proposals
    const highSeverity = anomalies.filter(a => a.severity === 'high')
    const otherAnomalies = anomalies.filter(a => a.severity !== 'high')

    // Create individual proposals for high-severity items
    for (const anomaly of highSeverity) {
      const proposalId = await createProposal({
        agentId,
        proposalType: 'payroll_anomaly',
        title: `🚨 ${anomaly.type.replace(/_/g, ' ').toUpperCase()}: ${anomaly.employee_name}`,
        summary: anomaly.description,
        detail: anomaly as unknown as Record<string, unknown>,
        targetEmployeeId: anomaly.employee_id,
        targetEntityType: 'time_entries',
        targetEntityId: anomaly.entry_id,
        riskLevel: 'high',
        expiresInHours: 48, // Payroll flags are urgent
      })

      if (proposalId) proposalsCreated++
    }

    // Create a summary proposal for medium/low items
    if (otherAnomalies.length > 0) {
      const summaryId = await createProposal({
        agentId,
        proposalType: 'payroll_anomaly',
        title: `Payroll Report — Week of ${weekStartDate}`,
        summary: `${anomalies.length} anomalies found: ${highSeverity.length} critical, ${otherAnomalies.length} warnings.`,
        detail: {
          week_start: weekStartDate,
          total_entries_scanned: (entries ?? []).length,
          employees_scanned: empEntries.size,
          anomaly_counts: {
            missing_clock_out: anomalies.filter(a => a.type === 'missing_clock_out').length,
            long_shift: anomalies.filter(a => a.type === 'long_shift').length,
            overtime: anomalies.filter(a => a.type === 'overtime').length,
            overtime_risk: anomalies.filter(a => a.type === 'overtime_risk').length,
            unapproved: anomalies.filter(a => a.type === 'unapproved').length,
            duplicate: anomalies.filter(a => a.type === 'duplicate').length,
          },
          anomalies: otherAnomalies,
        },
        riskLevel: 'low',
        expiresInHours: 168,
      })

      if (summaryId) {
        await autoApproveProposal(summaryId)
        proposalsCreated++
        proposalsAutoApproved++
      }
    }
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Scanned ${(entries ?? []).length} entries for ${empEntries.size} employees. Found ${anomalies.length} anomalies.`,
    metadata: {
      entriesScanned: (entries ?? []).length,
      employeesScanned: empEntries.size,
      anomalyCount: anomalies.length,
      weekStart: weekStartDate,
    },
  }
}

export default handler
