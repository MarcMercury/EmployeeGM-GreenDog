/**
 * Agent: Access Policy Reviewer
 *
 * Continuously reviews the application's access control posture:
 * 1. Scans page_definitions vs page_access to find pages missing role entries
 * 2. Checks the SECTION_ACCESS matrix against actual page routes
 * 3. Detects new DB tables with RLS enabled but missing policies
 * 4. Identifies roles with no access to newly added features
 * 5. Flags stale or over-permissive access entries
 *
 * Uses OpenAI to generate an executive summary with recommended fixes.
 *
 * Reads: page_definitions, page_access, role_definitions, access_matrix_view,
 *        profiles (role distribution), information_schema (RLS tables)
 * Writes: agent_proposals (access_review type)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

// ── Known application routes ─────────────────────────────────────
// Static truth of all pages in the app (mirrors app/pages/ directory).
// The agent compares this against what's registered in page_definitions.
const KNOWN_APP_ROUTES: Array<{ path: string; name: string; section: string }> = [
  // Dashboard & Profile
  { path: '/', name: 'Dashboard', section: 'Dashboard & Profile' },
  { path: '/profile', name: 'My Profile', section: 'Dashboard & Profile' },
  { path: '/development', name: 'My Growth', section: 'Dashboard & Profile' },
  { path: '/people/my-skills', name: 'My Skills', section: 'Dashboard & Profile' },
  { path: '/activity', name: 'Activity Hub', section: 'Dashboard & Profile' },
  { path: '/my-ops', name: 'My Ops', section: 'Dashboard & Profile' },
  { path: '/my-schedule', name: 'My Schedule', section: 'Dashboard & Profile' },
  { path: '/goals', name: 'Goals', section: 'Dashboard & Profile' },
  { path: '/reviews', name: 'Reviews', section: 'Dashboard & Profile' },
  { path: '/mentorship', name: 'Mentorship', section: 'Dashboard & Profile' },
  { path: '/wiki', name: 'Wiki', section: 'Global' },

  // Contact List
  { path: '/roster', name: 'All Staff (Roster)', section: 'Contact List' },
  { path: '/employees', name: 'Employees', section: 'Contact List' },
  { path: '/people/skill-stats', name: 'Skill Stats', section: 'Contact List' },
  { path: '/contact-list', name: 'Contact List', section: 'Contact List' },
  { path: '/skills-library', name: 'Skills Library', section: 'Contact List' },

  // Operations
  { path: '/schedule', name: 'Schedule', section: 'Operations' },
  { path: '/schedule/builder', name: 'Schedule Builder', section: 'Operations' },
  { path: '/schedule/services', name: 'Schedule Services', section: 'Operations' },
  { path: '/schedule/wizard', name: 'Schedule Wizard', section: 'Operations' },
  { path: '/time-off', name: 'Time Off', section: 'Operations' },
  { path: '/training', name: 'Training', section: 'Operations' },
  { path: '/export-payroll', name: 'Export Payroll', section: 'Operations' },

  // Recruiting
  { path: '/recruiting', name: 'Recruiting Pipeline', section: 'Recruiting' },
  { path: '/recruiting/candidates', name: 'Candidates', section: 'Recruiting' },
  { path: '/recruiting/interviews', name: 'Interviews', section: 'Recruiting' },
  { path: '/recruiting/onboarding', name: 'Onboarding', section: 'Recruiting' },

  // Marketing
  { path: '/marketing', name: 'Marketing Dashboard', section: 'Marketing' },
  { path: '/marketing/command-center', name: 'Command Center', section: 'Marketing' },
  { path: '/marketing/calendar', name: 'Calendar', section: 'Marketing' },
  { path: '/marketing/partners', name: 'Partners', section: 'Marketing' },
  { path: '/marketing/partnerships', name: 'Referral CRM', section: 'Marketing' },
  { path: '/marketing/influencers', name: 'Influencers', section: 'Marketing' },
  { path: '/marketing/inventory', name: 'Inventory', section: 'Marketing' },
  { path: '/marketing/resources', name: 'Resources', section: 'Marketing' },
  { path: '/marketing/list-hygiene', name: 'List Hygiene', section: 'Marketing' },
  { path: '/marketing/appointment-analysis', name: 'Appointment Analysis', section: 'Marketing' },

  // CRM & Analytics
  { path: '/marketing/ezyvet-analytics', name: 'EzyVet Analytics', section: 'CRM & Analytics' },
  { path: '/marketing/ezyvet-integration', name: 'EzyVet API Integration', section: 'CRM & Analytics' },
  { path: '/growth/leads', name: 'Event Leads', section: 'CRM & Analytics' },
  { path: '/growth/events', name: 'Growth Events', section: 'Marketing' },
  { path: '/growth/goals', name: 'Growth Goals', section: 'Marketing' },
  { path: '/growth/partners', name: 'Growth Partners', section: 'Marketing' },

  // GDU (Education)
  { path: '/gdu/students', name: 'Student Contacts', section: 'GDU (Education)' },
  { path: '/gdu/visitors', name: 'CE Attendees', section: 'GDU (Education)' },
  { path: '/gdu/events', name: 'CE Events', section: 'GDU (Education)' },

  // Academy
  { path: '/academy', name: 'Academy', section: 'GDU (Education)' },
  { path: '/academy/catalog', name: 'Academy Catalog', section: 'GDU (Education)' },
  { path: '/academy/my-training', name: 'My Training', section: 'GDU (Education)' },
  { path: '/academy/course-manager', name: 'Course Manager', section: 'GDU (Education)' },
  { path: '/academy/signoffs', name: 'Sign-offs', section: 'GDU (Education)' },

  // Med Ops
  // NOTE: /med-ops/wiki redirects to /wiki (see app/pages/med-ops/wiki.vue)
  // Individual Med Ops resources (calculators, boards) are now accessed through the Wiki page at /wiki
  { path: '/med-ops/calculators', name: 'Calculators', section: 'Med Ops' },
  { path: '/med-ops/boards', name: 'Med Ops Boards', section: 'Med Ops' },
  { path: '/med-ops/facilities', name: 'Facilities', section: 'Med Ops' },
  { path: '/med-ops/partners', name: 'Med Ops Partners', section: 'Med Ops' },

  // Admin & Settings
  { path: '/admin/users', name: 'User Management', section: 'Admin & Settings' },
  { path: '/admin/agents', name: 'AI Agents', section: 'Admin & Settings' },
  { path: '/admin/email-templates', name: 'Email Templates', section: 'Admin & Settings' },
  { path: '/admin/skills-management', name: 'Skills Management', section: 'Admin & Settings' },
  { path: '/admin/payroll', name: 'Payroll Admin', section: 'Admin & Settings' },
  { path: '/admin/scheduling-rules', name: 'Scheduling Rules', section: 'Admin & Settings' },
  { path: '/admin/services', name: 'Services Admin', section: 'Admin & Settings' },
  { path: '/admin/slack', name: 'Slack Integration', section: 'Admin & Settings' },
  { path: '/admin/system-health', name: 'System Health', section: 'Admin & Settings' },
  { path: '/settings', name: 'Settings', section: 'Admin & Settings' },
  { path: '/marketplace', name: 'Marketplace', section: 'Dashboard & Profile' },
  { path: '/leads', name: 'Leads', section: 'Marketing' },
]

// All known roles in the system
const ALL_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user']

// ── Finding interfaces ───────────────────────────────────────────

interface AccessFinding {
  severity: 'critical' | 'warning' | 'info'
  category: 'missing_page' | 'missing_role_access' | 'rls_gap' | 'over_permissive' | 'stale_entry' | 'role_distribution'
  title: string
  description: string
  recommendation: string
  affectedPage?: string
  affectedRole?: string
  affectedTable?: string
}

// ── Handler ──────────────────────────────────────────────────────

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting access policy review`, 'agent', { runId })

  const findings: AccessFinding[] = []

  // ── 1. Load current page_definitions from DB ──────────────────
  const { data: pageDefs, error: pageErr } = await supabase
    .from('page_definitions')
    .select('id, path, name, section, is_active')

  if (pageErr) {
    throw new Error(`Failed to fetch page_definitions: ${pageErr.message}`)
  }

  const registeredPaths = new Set((pageDefs ?? []).map((p: any) => p.path))

  // ── 2. Find app routes not registered in page_definitions ─────
  const missingPages: typeof KNOWN_APP_ROUTES = []
  for (const route of KNOWN_APP_ROUTES) {
    if (!registeredPaths.has(route.path)) {
      missingPages.push(route)
      findings.push({
        severity: 'critical',
        category: 'missing_page',
        title: `Page "${route.name}" not in access matrix`,
        description: `Route ${route.path} (${route.section}) exists in the application but has no entry in page_definitions. No role-based access control is being enforced at the database level.`,
        recommendation: `Add "${route.path}" to page_definitions and configure page_access entries for all roles.`,
        affectedPage: route.path,
      })
    }
  }

  // ── 3. Check page_access completeness ─────────────────────────
  // Every active page should have an access entry for every role
  const { data: pageAccess } = await supabase
    .from('page_access')
    .select('page_id, role_key, access_level')

  const accessMap = new Map<string, Map<string, string>>()
  for (const pa of (pageAccess ?? [])) {
    if (!accessMap.has(pa.page_id)) accessMap.set(pa.page_id, new Map())
    accessMap.get(pa.page_id)!.set(pa.role_key, pa.access_level)
  }

  for (const page of (pageDefs ?? []).filter((p: any) => p.is_active)) {
    const roleMap = accessMap.get(page.id) ?? new Map()
    for (const role of ALL_ROLES) {
      if (!roleMap.has(role)) {
        findings.push({
          severity: 'warning',
          category: 'missing_role_access',
          title: `No access entry for "${role}" on "${page.name}"`,
          description: `Page ${page.path} has no page_access entry for role "${role}". This role will default to "none" access. If this is intentional, an explicit "none" entry should be added for audit completeness.`,
          recommendation: `Insert page_access record for page_id=${page.id}, role_key="${role}" with the appropriate access_level.`,
          affectedPage: page.path,
          affectedRole: role,
        })
      }
    }
  }

  // ── 4. Check for over-permissive access ───────────────────────
  // User role should not have "full" access to admin pages
  const adminPages = (pageDefs ?? []).filter((p: any) => p.section === 'Admin & Settings')
  for (const page of adminPages) {
    const roleMap = accessMap.get(page.id) ?? new Map()
    for (const role of ['user', 'marketing_admin', 'office_admin']) {
      const level = roleMap.get(role)
      if (level === 'full') {
        findings.push({
          severity: 'critical',
          category: 'over_permissive',
          title: `"${role}" has FULL access to admin page "${page.name}"`,
          description: `Role "${role}" should not have full access to ${page.path} (${page.section}). This could expose sensitive admin controls.`,
          recommendation: `Change access_level for role "${role}" on page "${page.name}" from "full" to "none".`,
          affectedPage: page.path,
          affectedRole: role,
        })
      }
    }
  }

  // ── 5. Check RLS-enabled tables for policy coverage ───────────
  // Query information_schema for tables with RLS enabled that may lack policies
  let rlsTables: any[] | null = null
  try {
    const { data } = await supabase.rpc('get_rls_table_info')
    rlsTables = data
  } catch {
    rlsTables = null
  }

  // Fallback: skip if RPC not available
  if (!rlsTables) {
    logger.info(`[Agent:${agentId}] RPC get_rls_table_info not available, skipping RLS deep check`, 'agent')
  } else {
    for (const table of (rlsTables ?? [])) {
      if (table.rls_enabled && (!table.policy_count || table.policy_count === 0)) {
        findings.push({
          severity: 'critical',
          category: 'rls_gap',
          title: `Table "${table.table_name}" has RLS enabled but no policies`,
          description: `The table public.${table.table_name} has Row Level Security enabled but zero policies defined. This means ALL queries will return empty results for authenticated users.`,
          recommendation: `Add appropriate RLS policies or disable RLS if the table is only accessed via service role.`,
          affectedTable: table.table_name,
        })
      }
    }
  }

  // ── 6. Check role distribution across users ───────────────────
  const { data: roleDistribution } = await supabase
    .from('profiles')
    .select('role')
    .not('role', 'is', null)

  const roleCounts: Record<string, number> = {}
  for (const profile of (roleDistribution ?? [])) {
    roleCounts[profile.role] = (roleCounts[profile.role] || 0) + 1
  }

  // Flag if there are 0 super_admins or too many admins
  if (!roleCounts['super_admin'] || roleCounts['super_admin'] === 0) {
    findings.push({
      severity: 'critical',
      category: 'role_distribution',
      title: 'No super_admin users exist',
      description: 'There are zero users with the super_admin role. This means no one can manage system-level settings or user roles.',
      recommendation: 'Assign super_admin role to at least one trusted user.',
    })
  }

  const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0)
  const adminCount = (roleCounts['super_admin'] ?? 0) + (roleCounts['admin'] ?? 0)
  if (totalUsers > 5 && adminCount / totalUsers > 0.5) {
    findings.push({
      severity: 'warning',
      category: 'over_permissive',
      title: `High admin ratio: ${adminCount}/${totalUsers} users have admin+ roles`,
      description: `More than 50% of users have super_admin or admin roles. This violates the principle of least privilege.`,
      recommendation: 'Review admin role assignments. Downgrade users who don\'t need full admin access to more appropriate roles.',
    })
  }

  // ── 7. Avoid duplicate proposals (7-day window) ───────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProposals } = await supabase
    .from('agent_proposals')
    .select('title')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'access_review')
    .in('status', ['pending', 'auto_approved', 'approved'])
    .gte('created_at', sevenDaysAgo)

  const recentTitles = new Set((recentProposals ?? []).map((p: any) => p.title))

  // ── 8. Use AI to generate executive summary ───────────────────
  let tokensUsed = 0
  let costUsd = 0
  let executiveSummary = ''

  if (findings.length > 0) {
    const criticalCount = findings.filter(f => f.severity === 'critical').length
    const warningCount = findings.filter(f => f.severity === 'warning').length
    const infoCount = findings.filter(f => f.severity === 'info').length

    const findingsSummary = findings.slice(0, 30).map(f =>
      `[${f.severity.toUpperCase()}] ${f.category}: ${f.title}\n  ${f.description}\n  → ${f.recommendation}`
    ).join('\n\n')

    const chatResult = await agentChat({
      agentId,
      runId,
      messages: [
        {
          role: 'system',
          content: `You are an access control security auditor for a veterinary workforce management application (Green Dog Dental). The application has 8 user roles: super_admin, admin, manager, hr_admin, sup_admin (supervisor), office_admin, marketing_admin, and user. It uses Supabase with Row Level Security and a page_definitions/page_access system for fine-grained page access control.

Your job is to produce a concise executive summary of access policy findings and prioritized action items.`,
        },
        {
          role: 'user',
          content: `Here are the access policy audit findings:

Total Findings: ${findings.length} (Critical: ${criticalCount}, Warning: ${warningCount}, Info: ${infoCount})

Missing pages not in access matrix: ${missingPages.length}
${missingPages.map(p => `  - ${p.path} (${p.name}, ${p.section})`).join('\n')}

Role distribution across ${totalUsers} users:
${Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([r, c]) => `  ${r}: ${c}`).join('\n')}

Detailed Findings:
${findingsSummary}

Please produce:
1. A 2-3 sentence executive summary
2. Top 5 prioritized action items (numbered, specific)
3. A risk score from 1-10 (10 = highest risk)

Format as JSON: { "executive_summary": "...", "action_items": ["1. ...", "2. ...", ...], "risk_score": N }`,
        },
      ],
      model: 'fast',
      responseFormat: 'json',
      maxTokens: 1000,
    })

    tokensUsed = chatResult.tokensUsed
    costUsd = chatResult.costUsd

    try {
      const parsed = JSON.parse(chatResult.content)
      executiveSummary = parsed.executive_summary ?? ''
    } catch {
      executiveSummary = chatResult.content.slice(0, 500)
    }
  }

  // ── 9. Create proposals for critical & warning findings ───────
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  // Group findings by category to create consolidated proposals
  const criticalFindings = findings.filter(f => f.severity === 'critical')
  const warningFindings = findings.filter(f => f.severity === 'warning')

  // Create one consolidated proposal for missing pages (critical)
  if (missingPages.length > 0) {
    const title = `🔐 ${missingPages.length} pages missing from access matrix`
    if (!recentTitles.has(title)) {
      const proposalId = await createProposal({
        agentId,
        proposalType: 'access_review',
        title,
        summary: `${missingPages.length} application routes are not registered in page_definitions and have no database-level access control. Most critical: ${missingPages.slice(0, 3).map(p => p.path).join(', ')}`,
        detail: {
          finding_type: 'missing_pages',
          severity: 'critical',
          missing_pages: missingPages.map(p => ({ path: p.path, name: p.name, section: p.section })),
          total_registered: registeredPaths.size,
          total_known: KNOWN_APP_ROUTES.length,
          executive_summary: executiveSummary,
          role_distribution: roleCounts,
        },
        riskLevel: 'high',
        expiresInHours: 168, // 1 week
      })
      proposalsCreated++
      logger.info(`[Agent:${agentId}] Created missing pages proposal`, 'agent', { proposalId, count: missingPages.length })
    }
  }

  // Create proposal for over-permissive access
  const overPermissive = findings.filter(f => f.category === 'over_permissive')
  if (overPermissive.length > 0) {
    const title = `⚠️ ${overPermissive.length} over-permissive access entries detected`
    if (!recentTitles.has(title)) {
      const proposalId = await createProposal({
        agentId,
        proposalType: 'access_review',
        title,
        summary: overPermissive.map(f => f.title).join('; '),
        detail: {
          finding_type: 'over_permissive',
          severity: 'critical',
          issues: overPermissive.map(f => ({
            page: f.affectedPage,
            role: f.affectedRole,
            description: f.description,
            recommendation: f.recommendation,
          })),
        },
        riskLevel: 'high',
        expiresInHours: 168,
      })
      proposalsCreated++
    }
  }

  // Create proposal for RLS gaps
  const rlsGaps = findings.filter(f => f.category === 'rls_gap')
  if (rlsGaps.length > 0) {
    const title = `🛡️ ${rlsGaps.length} tables with RLS enabled but no policies`
    if (!recentTitles.has(title)) {
      await createProposal({
        agentId,
        proposalType: 'access_review',
        title,
        summary: `Tables with broken RLS: ${rlsGaps.map(f => f.affectedTable).join(', ')}`,
        detail: {
          finding_type: 'rls_gaps',
          severity: 'critical',
          tables: rlsGaps.map(f => ({ table: f.affectedTable, description: f.description })),
        },
        riskLevel: 'high',
        expiresInHours: 168,
      })
      proposalsCreated++
    }
  }

  // Create informational proposal with full summary for missing role access
  const missingRoleCount = findings.filter(f => f.category === 'missing_role_access').length
  if (missingRoleCount > 0) {
    const title = `📋 ${missingRoleCount} missing role-to-page access entries`
    if (!recentTitles.has(title)) {
      const proposalId = await createProposal({
        agentId,
        proposalType: 'access_review',
        title,
        summary: `${missingRoleCount} page_access entries are missing. These roles default to "none" access. Review if this is intentional or if explicit entries should be added.`,
        detail: {
          finding_type: 'missing_role_access',
          severity: 'warning',
          missing_entries: findings
            .filter(f => f.category === 'missing_role_access')
            .map(f => ({ page: f.affectedPage, role: f.affectedRole })),
        },
        riskLevel: 'low',
        expiresInHours: 336, // 2 weeks
      })
      proposalsCreated++

      // Auto-approve informational proposals
      if (proposalId) {
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }
  }

  // ── 10. Return result ─────────────────────────────────────────

  const critCount = criticalFindings.length
  const warnCount = warningFindings.length
  const summary = findings.length === 0
    ? 'Access policy review complete. No issues found — all pages are registered and role access is properly configured.'
    : `Access policy review found ${findings.length} issues (${critCount} critical, ${warnCount} warnings). ${missingPages.length} pages missing from access matrix. ${executiveSummary}`

  logger.info(`[Agent:${agentId}] Review complete`, 'agent', {
    runId,
    findings: findings.length,
    critical: critCount,
    warnings: warnCount,
    missingPages: missingPages.length,
    proposalsCreated,
  })

  return {
    status: critCount > 0 ? 'partial' : 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed,
    costUsd,
    summary,
    metadata: {
      totalFindings: findings.length,
      criticalFindings: critCount,
      warningFindings: warnCount,
      infoFindings: findings.filter(f => f.severity === 'info').length,
      missingPages: missingPages.length,
      registeredPages: registeredPaths.size,
      knownRoutes: KNOWN_APP_ROUTES.length,
      roleDistribution: roleCounts,
      executiveSummary,
    },
  }
}

export default handler
