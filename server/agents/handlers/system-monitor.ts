/**
 * Agent: System Monitor
 *
 * Watches over the System Settings page – ensuring Roles, Positions,
 * Company details, Database health, and Integrations are all up-to-date.
 *
 * Pure SQL/logic — no LLM calls needed.
 *
 * Reads:  company_settings, role_definitions, job_positions, departments,
 *         locations, employees (counts), agent_runs
 * Writes: agent_proposals (system_health_alert type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface HealthIssue {
  category: 'company' | 'roles' | 'positions' | 'departments' | 'locations' | 'integrations' | 'database'
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
}

const REQUIRED_COMPANY_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'contact_email', label: 'Contact Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'address', label: 'Address' },
  { key: 'website', label: 'Website' },
] as const

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting system monitor scan`, 'agent', { runId })

  const issues: HealthIssue[] = []

  // ==========================================================================
  // 1. Company Settings Completeness
  // ==========================================================================
  const { data: companyRow } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (!companyRow) {
    issues.push({
      category: 'company',
      severity: 'high',
      title: 'No company settings configured',
      detail: 'The company_settings table has no records. Navigate to System Settings → Company to configure.',
    })
  } else {
    const missing = REQUIRED_COMPANY_FIELDS.filter(f => {
      const val = companyRow[f.key]
      return !val || (typeof val === 'string' && val.trim() === '')
    })
    if (missing.length > 0) {
      issues.push({
        category: 'company',
        severity: missing.length >= 3 ? 'medium' : 'low',
        title: `Company profile incomplete — ${missing.length} fields missing`,
        detail: `Missing fields: ${missing.map(m => m.label).join(', ')}`,
      })
    }
  }

  // ==========================================================================
  // 2. Role Definitions
  // ==========================================================================
  const { data: roleDefs, error: roleErr } = await supabase
    .from('role_definitions')
    .select('role_key, display_name, tier')

  if (roleErr) {
    issues.push({
      category: 'roles',
      severity: 'medium',
      title: 'Cannot read role_definitions table',
      detail: `Error: ${roleErr.message}`,
    })
  } else if (!roleDefs || roleDefs.length === 0) {
    issues.push({
      category: 'roles',
      severity: 'high',
      title: 'No roles defined',
      detail: 'The role_definitions table is empty. Navigate to System Settings → Roles to create roles.',
    })
  } else {
    // Check for roles with no assigned users
    const { data: assignments } = await supabase
      .from('user_role_assignments')
      .select('role_key')

    const assignedKeys = new Set((assignments ?? []).map((a: any) => a.role_key))
    const emptyRoles = roleDefs.filter((r: any) => !assignedKeys.has(r.role_key))

    if (emptyRoles.length > 0 && emptyRoles.length < roleDefs.length) {
      issues.push({
        category: 'roles',
        severity: 'low',
        title: `${emptyRoles.length} roles with no assigned users`,
        detail: `Empty roles: ${emptyRoles.map((r: any) => r.display_name).join(', ')}`,
      })
    }
  }

  // ==========================================================================
  // 3. Positions & Departments coverage
  // ==========================================================================
  const { data: positions } = await supabase
    .from('job_positions')
    .select('id, title, code')

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)

  if (!positions || positions.length === 0) {
    issues.push({
      category: 'positions',
      severity: 'high',
      title: 'No job positions defined',
      detail: 'Create positions in System Settings → Positions so employees can be assigned.',
    })
  } else {
    // Check employees with no position
    const { count: unassignedCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .is('position_id', null)
      .eq('employment_status', 'active')

    if (unassignedCount && unassignedCount > 0) {
      issues.push({
        category: 'positions',
        severity: unassignedCount > 5 ? 'medium' : 'low',
        title: `${unassignedCount} active employees without a position`,
        detail: 'Assign positions to these employees to enable skills tracking and scheduling.',
      })
    }
  }

  if (!departments || departments.length === 0) {
    issues.push({
      category: 'departments',
      severity: 'medium',
      title: 'No departments defined',
      detail: 'Create departments in System Settings → Departments for organizational structure.',
    })
  } else {
    // Check employees with no department
    const { count: noDeptCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .is('department_id', null)
      .eq('employment_status', 'active')

    if (noDeptCount && noDeptCount > 0) {
      issues.push({
        category: 'departments',
        severity: noDeptCount > 5 ? 'medium' : 'low',
        title: `${noDeptCount} active employees without a department`,
        detail: 'Assign departments to these employees for proper organizational reporting.',
      })
    }
  }

  // ==========================================================================
  // 4. Locations check
  // ==========================================================================
  const { data: locs } = await supabase
    .from('locations')
    .select('id, name, is_active')

  if (!locs || locs.length === 0) {
    issues.push({
      category: 'locations',
      severity: 'medium',
      title: 'No locations configured',
      detail: 'Add at least one clinic location in System Settings → Locations.',
    })
  } else {
    const activeLocs = locs.filter((l: any) => l.is_active)
    if (activeLocs.length === 0) {
      issues.push({
        category: 'locations',
        severity: 'high',
        title: 'All locations are inactive',
        detail: `${locs.length} locations exist but none are marked active.`,
      })
    }
  }

  // ==========================================================================
  // 5. Integrations — Slack, EzyVet connectivity
  // ==========================================================================
  try {
    const slackHealth = await $fetch('/api/slack/health').catch(() => null) as any
    if (!slackHealth || slackHealth.status === 'error') {
      issues.push({
        category: 'integrations',
        severity: 'medium',
        title: 'Slack integration unhealthy',
        detail: 'The Slack health check returned an error. Check webhook/token configuration.',
      })
    }
  } catch {
    // Can't reliably check from server context — skip
  }

  // Check if ezyvet_contacts has recent data (within 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentEzyvetCount } = await supabase
    .from('ezyvet_contacts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)
    .limit(1)

  if ((recentEzyvetCount ?? 0) === 0) {
    // Check if there is any ezyvet data at all
    const { count: totalEzyvet } = await supabase
      .from('ezyvet_contacts')
      .select('*', { count: 'exact', head: true })
      .limit(1)

    if ((totalEzyvet ?? 0) === 0) {
      issues.push({
        category: 'integrations',
        severity: 'low',
        title: 'No EzyVet contacts imported',
        detail: 'The ezyvet_contacts table is empty. Import contacts to enable referral intelligence.',
      })
    } else {
      issues.push({
        category: 'integrations',
        severity: 'low',
        title: 'EzyVet data may be stale',
        detail: 'No new ezyvet_contacts in the last 30 days. Consider running a fresh import.',
      })
    }
  }

  // ==========================================================================
  // 6. Database Health — check for recent failed agent runs
  // ==========================================================================
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: failedRunCount } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error')
    .gte('started_at', oneDayAgo)

  if (failedRunCount && failedRunCount >= 3) {
    issues.push({
      category: 'database',
      severity: 'medium',
      title: `${failedRunCount} failed agent runs in last 24h`,
      detail: 'Multiple agent runs have failed recently. Check the AI Agents dashboard for details.',
    })
  }

  // Check total employee count (sanity — minimum viable data)
  const { count: empCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('employment_status', 'active')

  if ((empCount ?? 0) === 0) {
    issues.push({
      category: 'database',
      severity: 'high',
      title: 'No active employees in database',
      detail: 'The employees table has no active records. Import employee data to get started.',
    })
  }

  // ==========================================================================
  // 7. Build proposals from issues
  // ==========================================================================
  // Avoid duplicate proposals — check recent ones
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProposals } = await supabase
    .from('agent_proposals')
    .select('title')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'system_health_alert')
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', weekAgo)

  const existingTitles = new Set(
    (recentProposals ?? []).map((p: any) => p.title)
  )

  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  // Only create proposals for medium/high issues not already flagged
  const actionableIssues = issues.filter(
    i => (i.severity === 'medium' || i.severity === 'high') && !existingTitles.has(i.title)
  )

  for (const issue of actionableIssues) {
    const proposalId = await createProposal({
      agentId,
      proposalType: 'system_health_alert',
      title: issue.title,
      summary: issue.detail,
      detail: {
        category: issue.category,
        severity: issue.severity,
        scanned_at: new Date().toISOString(),
      },
      riskLevel: issue.severity === 'high' ? 'medium' : 'low',
      expiresInHours: 168, // 1 week
    })

    if (proposalId) {
      proposalsCreated++
      // Auto-approve informational alerts
      if (issue.severity !== 'high') {
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }
  }

  // Create summary report proposal
  const summaryId = await createProposal({
    agentId,
    proposalType: 'system_health_report',
    title: `System Monitor Report — ${new Date().toLocaleDateString()}`,
    summary: `Scanned 7 categories. Found ${issues.length} issues (${issues.filter(i => i.severity === 'high').length} high, ${issues.filter(i => i.severity === 'medium').length} medium, ${issues.filter(i => i.severity === 'low').length} low).`,
    detail: {
      total_issues: issues.length,
      high_count: issues.filter(i => i.severity === 'high').length,
      medium_count: issues.filter(i => i.severity === 'medium').length,
      low_count: issues.filter(i => i.severity === 'low').length,
      categories_scanned: ['company', 'roles', 'positions', 'departments', 'locations', 'integrations', 'database'],
      issues: issues.map(i => ({
        category: i.category,
        severity: i.severity,
        title: i.title,
      })),
      employee_count: empCount ?? 0,
      position_count: positions?.length ?? 0,
      department_count: departments?.length ?? 0,
      location_count: locs?.length ?? 0,
      role_count: roleDefs?.length ?? 0,
    },
    riskLevel: 'low',
    expiresInHours: 168,
  })

  if (summaryId) {
    await autoApproveProposal(summaryId)
    proposalsCreated++
    proposalsAutoApproved++
  }

  logger.info(`[Agent:${agentId}] System monitor scan complete`, 'agent', {
    runId,
    issues: issues.length,
    proposals: proposalsCreated,
  })

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: `Scanned 7 system categories. Found ${issues.length} issues. Created ${proposalsCreated} proposals.`,
    metadata: {
      totalIssues: issues.length,
      highSeverity: issues.filter(i => i.severity === 'high').length,
      mediumSeverity: issues.filter(i => i.severity === 'medium').length,
      lowSeverity: issues.filter(i => i.severity === 'low').length,
    },
  }
}

export default handler
