/**
 * Agent B5: Compliance Tracker
 *
 * Extends the existing credential-expiry-check cron with deeper compliance monitoring.
 * Checks licenses, certifications, CE credits, and mandatory training.
 * Pure SQL/logic — no LLM calls needed.
 *
 * Reads: employee_licenses, employee_certifications, employee_ce_credits,
 *        certifications, training_enrollments, training_progress, employees
 * Writes: agent_proposals (compliance_alert type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

// Reminder windows in days
const REMINDER_WINDOWS = [60, 30, 14, 7]

interface ComplianceIssue {
  type: 'license_expiring' | 'cert_expiring' | 'license_expired' | 'cert_expired' | 'ce_credits_low' | 'training_overdue'
  severity: 'low' | 'medium' | 'high'
  employee_id: string
  employee_name: string
  description: string
  days_until?: number
  entity_type?: string
  entity_name?: string
}

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting compliance tracking`, 'agent', { runId })

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // 1. Get all active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, position_id')
    .eq('employment_status', 'active')

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  const empMap = new Map<string, any>()
  for (const emp of employees) {
    empMap.set(emp.id, emp)
  }

  // 2. Avoid duplicate alerts (check 7-day window)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentAlerts } = await supabase
    .from('agent_proposals')
    .select('target_employee_id, detail')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'compliance_alert')
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', sevenDaysAgo)

  const recentAlertKeys = new Set(
    (recentAlerts ?? []).map((p: any) => `${p.target_employee_id}:${p.detail?.type ?? ''}:${p.detail?.entity_name ?? ''}`)
  )

  const issues: ComplianceIssue[] = []

  // 3. Check licenses
  const { data: licenses } = await supabase
    .from('employee_licenses')
    .select('id, employee_id, license_type, license_number, expiration_date, is_verified')
    .eq('is_verified', true)

  for (const lic of (licenses ?? [])) {
    const emp = empMap.get(lic.employee_id)
    if (!emp || !lic.expiration_date) continue

    const name = `${emp.first_name} ${emp.last_name}`
    const expDate = new Date(lic.expiration_date)
    const daysUntil = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      issues.push({
        type: 'license_expired',
        severity: 'high',
        employee_id: lic.employee_id,
        employee_name: name,
        description: `License "${lic.license_type}" (${lic.license_number}) expired ${Math.abs(daysUntil)} days ago`,
        days_until: daysUntil,
        entity_type: 'employee_licenses',
        entity_name: lic.license_type,
      })
    } else {
      // Check each reminder window
      for (const window of REMINDER_WINDOWS) {
        if (daysUntil <= window && daysUntil > (window === 7 ? 0 : REMINDER_WINDOWS[REMINDER_WINDOWS.indexOf(window) + 1] ?? 0)) {
          issues.push({
            type: 'license_expiring',
            severity: daysUntil <= 14 ? 'medium' : 'low',
            employee_id: lic.employee_id,
            employee_name: name,
            description: `License "${lic.license_type}" expires in ${daysUntil} days (${lic.expiration_date})`,
            days_until: daysUntil,
            entity_type: 'employee_licenses',
            entity_name: lic.license_type,
          })
          break
        }
      }
    }
  }

  // 4. Check certifications
  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('id, employee_id, certification_id, certification_number, expiration_date, status')
    .in('status', ['active', 'renewal_pending'])

  const { data: certDefs } = await supabase
    .from('certifications')
    .select('id, name')

  const certNameMap = new Map<string, string>()
  for (const c of (certDefs ?? [])) {
    certNameMap.set(c.id, c.name)
  }

  for (const cert of (certs ?? [])) {
    const emp = empMap.get(cert.employee_id)
    if (!emp || !cert.expiration_date) continue

    const name = `${emp.first_name} ${emp.last_name}`
    const certName = certNameMap.get(cert.certification_id) ?? 'Unknown Cert'
    const expDate = new Date(cert.expiration_date)
    const daysUntil = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      issues.push({
        type: 'cert_expired',
        severity: 'high',
        employee_id: cert.employee_id,
        employee_name: name,
        description: `Certification "${certName}" expired ${Math.abs(daysUntil)} days ago`,
        days_until: daysUntil,
        entity_type: 'employee_certifications',
        entity_name: certName,
      })
    } else if (daysUntil <= 60) {
      issues.push({
        type: 'cert_expiring',
        severity: daysUntil <= 14 ? 'medium' : 'low',
        employee_id: cert.employee_id,
        employee_name: name,
        description: `Certification "${certName}" expires in ${daysUntil} days`,
        days_until: daysUntil,
        entity_type: 'employee_certifications',
        entity_name: certName,
      })
    }
  }

  // 5. Check CE credits
  const currentYear = now.getFullYear()
  const { data: ceCredits } = await supabase
    .from('employee_ce_credits')
    .select('employee_id, annual_budget, used_credits, year')
    .eq('year', currentYear)

  for (const ce of (ceCredits ?? [])) {
    const emp = empMap.get(ce.employee_id)
    if (!emp || !ce.annual_budget) continue

    const remaining = ce.annual_budget - (ce.used_credits ?? 0)
    const percentUsed = ((ce.used_credits ?? 0) / ce.annual_budget) * 100
    const monthsLeft = 12 - now.getMonth()

    // Flag if less than 25% of budget used and more than half the year is gone
    if (percentUsed < 25 && now.getMonth() >= 6) {
      issues.push({
        type: 'ce_credits_low',
        severity: 'medium',
        employee_id: ce.employee_id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        description: `Only ${ce.used_credits ?? 0}/${ce.annual_budget} CE credits used with ${monthsLeft} months remaining`,
        entity_type: 'employee_ce_credits',
      })
    }
  }

  // 6. Check overdue required training
  const { data: enrollments } = await supabase
    .from('training_enrollments')
    .select('id, employee_id, course_id, status, due_date')
    .in('status', ['enrolled', 'in_progress'])
    .lt('due_date', todayStr)

  for (const enrollment of (enrollments ?? [])) {
    const emp = empMap.get(enrollment.employee_id)
    if (!emp) continue

    const daysOverdue = Math.floor((now.getTime() - new Date(enrollment.due_date).getTime()) / (1000 * 60 * 60 * 24))

    issues.push({
      type: 'training_overdue',
      severity: daysOverdue > 30 ? 'high' : 'medium',
      employee_id: enrollment.employee_id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      description: `Required training overdue by ${daysOverdue} days`,
      days_until: -daysOverdue,
      entity_type: 'training_enrollments',
    })
  }

  // 7. Create proposals (skip recently alerted)
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  for (const issue of issues) {
    const alertKey = `${issue.employee_id}:${issue.type}:${issue.entity_name ?? ''}`
    if (recentAlertKeys.has(alertKey)) continue

    const proposalId = await createProposal({
      agentId,
      proposalType: 'compliance_alert',
      title: `${issue.severity === 'high' ? '🚨' : '⚠️'} ${issue.type.replace(/_/g, ' ').toUpperCase()}: ${issue.employee_name}`,
      summary: issue.description,
      detail: issue as unknown as Record<string, unknown>,
      targetEmployeeId: issue.employee_id,
      targetEntityType: issue.entity_type ?? 'employees',
      riskLevel: issue.severity,
      expiresInHours: issue.severity === 'high' ? 72 : 168,
    })

    if (proposalId) {
      proposalsCreated++
      // Auto-approve low-severity reminders
      if (issue.severity === 'low') {
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }
  }

  // 8. Summary proposal
  const summaryId = await createProposal({
    agentId,
    proposalType: 'compliance_report',
    title: `Compliance Report — ${todayStr}`,
    summary: `${issues.length} compliance issues found across ${employees.length} employees.`,
    detail: {
      total_issues: issues.length,
      by_type: {
        license_expired: issues.filter(i => i.type === 'license_expired').length,
        license_expiring: issues.filter(i => i.type === 'license_expiring').length,
        cert_expired: issues.filter(i => i.type === 'cert_expired').length,
        cert_expiring: issues.filter(i => i.type === 'cert_expiring').length,
        ce_credits_low: issues.filter(i => i.type === 'ce_credits_low').length,
        training_overdue: issues.filter(i => i.type === 'training_overdue').length,
      },
      by_severity: {
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
      critical_items: issues
        .filter(i => i.severity === 'high')
        .map(i => ({ name: i.employee_name, type: i.type, description: i.description })),
    },
    riskLevel: 'low',
    expiresInHours: 168,
  })

  if (summaryId) {
    await autoApproveProposal(summaryId)
    proposalsCreated++
    proposalsAutoApproved++
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Found ${issues.length} compliance issues. ${issues.filter(i => i.severity === 'high').length} critical.`,
    metadata: {
      totalIssues: issues.length,
      criticalCount: issues.filter(i => i.severity === 'high').length,
      employeesChecked: employees.length,
    },
  }
}

export default handler
