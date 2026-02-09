/**
 * Agent B3: Attendance Monitor
 *
 * Analyzes clock-ins, lateness, and reliability scores.
 * Pure SQL/logic — no LLM calls needed.
 *
 * Reads: time_punches, attendance, shifts, employees
 * Writes: agent_proposals (attendance_flag type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const RELIABILITY_WINDOW_DAYS = 90
const WARN_THRESHOLD = 80    // Below 80% → notify supervisor
const ALERT_THRESHOLD = 60   // Below 60% → notify HR + manager
const NO_SHOW_LIMIT = 3      // 3+ no-shows → disciplinary review proposal

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting attendance monitoring`, 'agent', { runId })

  const windowStart = new Date(Date.now() - RELIABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 1. Get all attendance records in the rolling window
  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('id, employee_id, shift_id, shift_date, status, minutes_late, penalty_weight')
    .gte('shift_date', windowStart.split('T')[0])
    .order('shift_date', { ascending: false })

  if (attErr) {
    throw new Error(`Failed to fetch attendance: ${attErr.message}`)
  }

  // 2. Get all active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, manager_employee_id')
    .eq('employment_status', 'active')

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  const empMap = new Map<string, any>()
  for (const emp of employees) {
    empMap.set(emp.id, emp)
  }

  // 3. Avoid duplicate proposals (check recent)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProposals } = await supabase
    .from('agent_proposals')
    .select('target_employee_id, proposal_type')
    .eq('agent_id', agentId)
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', oneDayAgo)

  const recentFlags = new Set(
    (recentProposals ?? []).map((p: any) => `${p.target_employee_id}:${p.proposal_type}`)
  )

  // 4. Compute reliability scores per employee
  const empAttendance = new Map<string, any[]>()
  for (const record of (attendance ?? [])) {
    if (!empAttendance.has(record.employee_id)) empAttendance.set(record.employee_id, [])
    empAttendance.get(record.employee_id)!.push(record)
  }

  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  const flaggedEmployees: Array<{
    employee_id: string
    name: string
    score: number
    lateCount: number
    noShowCount: number
    totalShifts: number
  }> = []

  for (const [empId, records] of empAttendance) {
    const emp = empMap.get(empId)
    if (!emp) continue

    const totalShifts = records.length
    if (totalShifts === 0) continue

    // Count issues
    let onTimeCount = 0
    let lateCount = 0
    let noShowCount = 0
    let absentCount = 0
    let totalLateMins = 0

    for (const r of records) {
      switch (r.status) {
        case 'present':
          onTimeCount++
          break
        case 'late':
          lateCount++
          totalLateMins += r.minutes_late ?? 0
          break
        case 'excused_late':
          // Count as on-time but track
          onTimeCount++
          break
        case 'absent':
          absentCount++
          break
        case 'no_show':
          noShowCount++
          break
        case 'excused_absent':
          // Don't penalize
          onTimeCount++
          break
      }
    }

    // Reliability = (on_time + excused) / total * 100, with a penalty weight for late/absent
    const penalizedShifts = totalShifts - noShowCount - absentCount
    const score = penalizedShifts > 0
      ? Math.round((onTimeCount / totalShifts) * 100)
      : 0

    const empName = `${emp.first_name} ${emp.last_name}`

    // Check thresholds
    if (score < ALERT_THRESHOLD && !recentFlags.has(`${empId}:attendance_flag`)) {
      flaggedEmployees.push({ employee_id: empId, name: empName, score, lateCount, noShowCount, totalShifts })

      const proposalId = await createProposal({
        agentId,
        proposalType: 'attendance_flag',
        title: `⚠️ Low Reliability: ${empName} (${score}%)`,
        summary: `${lateCount} lates, ${noShowCount} no-shows in ${totalShifts} shifts over ${RELIABILITY_WINDOW_DAYS} days. Requires HR attention.`,
        detail: {
          employee_id: empId,
          employee_name: empName,
          reliability_score: score,
          total_shifts: totalShifts,
          on_time: onTimeCount,
          late_count: lateCount,
          avg_late_minutes: lateCount > 0 ? Math.round(totalLateMins / lateCount) : 0,
          no_show_count: noShowCount,
          absent_count: absentCount,
          window_days: RELIABILITY_WINDOW_DAYS,
          recommended_action: noShowCount >= NO_SHOW_LIMIT
            ? 'disciplinary_review'
            : 'manager_conversation',
        },
        targetEmployeeId: empId,
        targetEntityType: 'attendance',
        riskLevel: noShowCount >= NO_SHOW_LIMIT ? 'high' : 'medium',
        expiresInHours: 168,
      })

      if (proposalId) proposalsCreated++
    } else if (score < WARN_THRESHOLD && score >= ALERT_THRESHOLD && !recentFlags.has(`${empId}:attendance_flag`)) {
      flaggedEmployees.push({ employee_id: empId, name: empName, score, lateCount, noShowCount, totalShifts })

      const proposalId = await createProposal({
        agentId,
        proposalType: 'attendance_flag',
        title: `Declining Reliability: ${empName} (${score}%)`,
        summary: `${lateCount} lates in ${totalShifts} shifts. Supervisor should be aware.`,
        detail: {
          employee_id: empId,
          employee_name: empName,
          reliability_score: score,
          total_shifts: totalShifts,
          on_time: onTimeCount,
          late_count: lateCount,
          no_show_count: noShowCount,
          window_days: RELIABILITY_WINDOW_DAYS,
          recommended_action: 'supervisor_awareness',
        },
        targetEmployeeId: empId,
        targetEntityType: 'attendance',
        riskLevel: 'low',
        expiresInHours: 168,
      })

      if (proposalId) {
        proposalsCreated++
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }
  }

  // 5. Summary proposal
  if (flaggedEmployees.length > 0) {
    const summaryId = await createProposal({
      agentId,
      proposalType: 'attendance_report',
      title: `Attendance Report — ${new Date().toLocaleDateString()}`,
      summary: `${flaggedEmployees.length} employees flagged for attendance issues.`,
      detail: {
        flagged_count: flaggedEmployees.length,
        critical: flaggedEmployees.filter(e => e.score < ALERT_THRESHOLD).length,
        warning: flaggedEmployees.filter(e => e.score >= ALERT_THRESHOLD && e.score < WARN_THRESHOLD).length,
        employees: flaggedEmployees.sort((a, b) => a.score - b.score),
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

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Monitored ${empAttendance.size} employees. Flagged ${flaggedEmployees.length} for attendance issues.`,
    metadata: {
      employeesMonitored: empAttendance.size,
      flaggedCount: flaggedEmployees.length,
      windowDays: RELIABILITY_WINDOW_DAYS,
    },
  }
}

export default handler
