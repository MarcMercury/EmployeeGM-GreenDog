/**
 * Agent B1: HR Auditor
 *
 * Ensures all employee profiles are complete and current.
 * Pure SQL/logic — no LLM calls needed.
 *
 * Reads: employees, profiles, employee_licenses, employee_certifications
 * Writes: agent_proposals (profile_update_request type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

interface CompletenessRule {
  field: string
  label: string
  check: (emp: any) => boolean
  weight: number // 0-1 importance
}

const COMPLETENESS_RULES: CompletenessRule[] = [
  { field: 'email_work', label: 'Work Email', check: (e) => !!e.email_work, weight: 1 },
  { field: 'phone_mobile', label: 'Mobile Phone', check: (e) => !!e.phone_mobile, weight: 0.8 },
  { field: 'date_of_birth', label: 'Date of Birth', check: (e) => !!e.date_of_birth, weight: 0.6 },
  { field: 'address_street', label: 'Street Address', check: (e) => !!e.address_street, weight: 0.7 },
  { field: 'address_city', label: 'City', check: (e) => !!e.address_city, weight: 0.7 },
  { field: 'address_state', label: 'State', check: (e) => !!e.address_state, weight: 0.7 },
  { field: 'address_zip', label: 'Zip Code', check: (e) => !!e.address_zip, weight: 0.7 },
  { field: 'emergency_contact_name', label: 'Emergency Contact Name', check: (e) => !!e.emergency_contact_name, weight: 1 },
  { field: 'emergency_contact_phone', label: 'Emergency Contact Phone', check: (e) => !!e.emergency_contact_phone, weight: 1 },
  { field: 'position_id', label: 'Job Position', check: (e) => !!e.position_id, weight: 0.9 },
  { field: 'department_id', label: 'Department', check: (e) => !!e.department_id, weight: 0.8 },
  { field: 'hire_date', label: 'Hire Date', check: (e) => !!e.hire_date, weight: 0.9 },
]

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting HR audit`, 'agent', { runId })

  // 1. Fetch all active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select(`
      id, first_name, last_name, email_work, phone_mobile, phone_work,
      date_of_birth, address_street, address_city, address_state, address_zip,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      position_id, department_id, hire_date, employment_status, profile_id
    `)
    .eq('employment_status', 'active')

  if (empErr || !employees) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`)
  }

  // 2. Check for active licenses/certifications
  const { data: licenses } = await supabase
    .from('employee_licenses')
    .select('employee_id, status, expiration_date')

  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('employee_id, status, expiration_date')

  // Build license/cert maps
  const licensesByEmp = new Map<string, any[]>()
  for (const lic of (licenses ?? [])) {
    if (!licensesByEmp.has(lic.employee_id)) licensesByEmp.set(lic.employee_id, [])
    licensesByEmp.get(lic.employee_id)!.push(lic)
  }
  const certsByEmp = new Map<string, any[]>()
  for (const cert of (certs ?? [])) {
    if (!certsByEmp.has(cert.employee_id)) certsByEmp.set(cert.employee_id, [])
    certsByEmp.get(cert.employee_id)!.push(cert)
  }

  // 3. Check existing recent proposals to avoid duplicate nagging
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProposals } = await supabase
    .from('agent_proposals')
    .select('target_employee_id')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'profile_update_request')
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', threeDaysAgo)

  const recentlyNotified = new Set(
    (recentProposals ?? []).map((p: any) => p.target_employee_id)
  )

  // 4. Audit each employee
  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  let totalIncomplete = 0
  const auditResults: Array<{
    employee_id: string
    name: string
    score: number
    missing: string[]
  }> = []

  for (const emp of employees) {
    const missing: string[] = []
    let totalWeight = 0
    let earnedWeight = 0

    for (const rule of COMPLETENESS_RULES) {
      totalWeight += rule.weight
      if (rule.check(emp)) {
        earnedWeight += rule.weight
      } else {
        missing.push(rule.label)
      }
    }

    // Check if employee has at least one active license
    const empLicenses = licensesByEmp.get(emp.id) ?? []
    const hasActiveLicense = empLicenses.some((l: any) => l.status === 'active')
    if (!hasActiveLicense && empLicenses.length === 0) {
      // Only flag if no licenses at all — some positions may not need them
      // We'll make this a lower-weight check
    }

    const score = Math.round((earnedWeight / totalWeight) * 100)

    if (missing.length > 0) {
      totalIncomplete++
      auditResults.push({
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        score,
        missing,
      })

      // Create proposal if not recently notified and score below threshold
      if (!recentlyNotified.has(emp.id) && score < 90) {
        const proposalId = await createProposal({
          agentId,
          proposalType: 'profile_update_request',
          title: `Incomplete Profile: ${emp.first_name} ${emp.last_name} (${score}%)`,
          summary: `Missing: ${missing.join(', ')}`,
          detail: {
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            completeness_score: score,
            missing_fields: missing,
            total_fields_checked: COMPLETENESS_RULES.length,
          },
          targetEmployeeId: emp.id,
          targetEntityType: 'employees',
          targetEntityId: emp.id,
          riskLevel: score < 50 ? 'medium' : 'low',
          expiresInHours: 168, // 1 week
        })

        if (proposalId) {
          proposalsCreated++
          // Auto-approve low-risk reminder proposals
          if (score >= 50) {
            await autoApproveProposal(proposalId)
            proposalsAutoApproved++
          }
        }
      }
    }
  }

  // 5. Create summary proposal
  const summaryId = await createProposal({
    agentId,
    proposalType: 'hr_audit_report',
    title: `HR Audit Summary — ${new Date().toLocaleDateString()}`,
    summary: `Audited ${employees.length} employees. ${totalIncomplete} have incomplete profiles.`,
    detail: {
      total_audited: employees.length,
      incomplete_count: totalIncomplete,
      complete_count: employees.length - totalIncomplete,
      avg_completeness: auditResults.length > 0
        ? Math.round(auditResults.reduce((sum: number, r: any) => sum + r.score, 0) / auditResults.length)
        : 100,
      top_missing_fields: getMostCommonMissing(auditResults),
      worst_profiles: auditResults
        .sort((a, b) => a.score - b.score)
        .slice(0, 10)
        .map(r => ({ name: r.name, score: r.score, missing: r.missing })),
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
    summary: `Audited ${employees.length} employees. ${totalIncomplete} incomplete. Created ${proposalsCreated} proposals.`,
    metadata: {
      totalAudited: employees.length,
      incompleteCount: totalIncomplete,
    },
  }
}

function getMostCommonMissing(results: Array<{ missing: string[] }>): Array<{ field: string; count: number }> {
  const counts = new Map<string, number>()
  for (const r of results) {
    for (const m of r.missing) {
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

export default handler
