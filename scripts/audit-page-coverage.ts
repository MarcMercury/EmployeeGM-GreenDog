#!/usr/bin/env node
/**
 * Access Matrix Completeness Auditor
 * 
 * Scans all Nuxt page files under app/pages/ and compares them against the
 * page_definitions table in the database. Reports any pages that exist in the
 * filesystem but are missing from the access matrix.
 *
 * This script is the automated equivalent of the "page-auditor" agent.
 * Run it regularly (CI, pre-deploy, or cron) to catch access matrix drift.
 *
 * Usage:
 *   npx tsx scripts/audit-page-coverage.ts
 *   npx tsx scripts/audit-page-coverage.ts --fix   # generates SQL to add missing pages
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Configuration ──────────────────────────────────────────────
const PAGES_DIR = join(__dirname, '..', 'app', 'pages')

/** Routes that don't need access matrix entries */
const EXCLUDED_PREFIXES = [
  '/auth/',       // Auth flow (login, callback)
  '/public/',     // Public pages (careers, lead-capture)
  '/intake/',     // Public intake forms
]

/** Dynamic route segments — these inherit parent access */
const DYNAMIC_ROUTE_PATTERN = /\[.*\]/

/** Section assignment rules for auto-fix */
const SECTION_RULES: Array<{ match: (path: string) => boolean; section: string; sortBase: number }> = [
  { match: p => ['/activity', '/wiki', '/marketplace'].includes(p), section: 'Global', sortBase: 100 },
  { match: p => ['/profile', '/contact-list', '/my-schedule', '/development', '/goals', '/reviews', '/mentorship', '/my-ops', '/my-ops'].includes(p), section: 'My Workspace', sortBase: 200 },
  { match: p => p.startsWith('/people/'), section: 'My Workspace', sortBase: 200 },
  { match: p => p.startsWith('/academy/') && !['course-manager', 'signoffs', 'manager'].some(s => p.includes(s)), section: 'My Workspace', sortBase: 250 },
  { match: p => p === '/training' || p.startsWith('/training/'), section: 'My Workspace', sortBase: 250 },
  { match: p => ['/roster', '/employees', '/skills-library'].includes(p), section: 'Management', sortBase: 300 },
  { match: p => p.includes('/academy/signoffs') || p.includes('/academy/manager'), section: 'Management', sortBase: 340 },
  { match: p => p.startsWith('/med-ops/'), section: 'Med Ops', sortBase: 400 },
  { match: p => p.startsWith('/schedule') || p === '/time-off' || p === '/export-payroll', section: 'HR', sortBase: 500 },
  { match: p => p.startsWith('/recruiting') || p.startsWith('/admin/intake') || p.startsWith('/admin/master-roster') || p.startsWith('/admin/payroll'), section: 'HR', sortBase: 550 },
  { match: p => p === '/marketing' || (p.startsWith('/marketing/') && !['sauron', 'ezyvet', 'appointment', 'invoice', 'list-hygiene'].some(s => p.includes(s))), section: 'Marketing', sortBase: 600 },
  { match: p => p.startsWith('/growth/'), section: 'Marketing', sortBase: 660 },
  { match: p => ['/leads'].includes(p), section: 'Marketing', sortBase: 668 },
  { match: p => p.includes('sauron') || p.includes('ezyvet') || p.includes('appointment-analysis') || p.includes('invoice-analysis') || p.includes('list-hygiene'), section: 'CRM & Analytics', sortBase: 700 },
  { match: p => p.startsWith('/gdu'), section: 'GDU', sortBase: 800 },
  { match: p => p.startsWith('/admin/') || p === '/settings', section: 'Admin Ops', sortBase: 900 },
]

// ── Helpers ─────────────────────────────────────────────────────

function fileToRoute(filePath: string): string {
  let route = '/' + relative(PAGES_DIR, filePath)
    .replace(/\.vue$/, '')
    .replace(/\/index$/, '')
    .replace(/\\/g, '/')

  // app/pages/index.vue → '/'
  if (route === '/index') return '/'
  if (route === '/') return '/'
  return route
}

function isDynamic(route: string): boolean {
  return DYNAMIC_ROUTE_PATTERN.test(route)
}

function isExcluded(route: string): boolean {
  return EXCLUDED_PREFIXES.some(prefix => route.startsWith(prefix))
}

function getAllVuePages(dir: string): string[] {
  const results: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...getAllVuePages(fullPath))
    } else if (entry.endsWith('.vue')) {
      results.push(fullPath)
    }
  }

  return results
}

function guessSection(route: string): { section: string; sortOrder: number } {
  for (const rule of SECTION_RULES) {
    if (rule.match(route)) {
      return { section: rule.section, sortOrder: rule.sortBase + Math.floor(Math.random() * 10) }
    }
  }
  return { section: 'My Workspace', sortOrder: 290 }
}

function toDisplayName(route: string): string {
  const parts = route.split('/').filter(Boolean)
  const last = parts[parts.length - 1] || 'Home'
  return last
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Main ────────────────────────────────────────────────────────

function main() {
  const fixMode = process.argv.includes('--fix')

  if (!existsSync(PAGES_DIR)) {
    console.error(`❌ Pages directory not found: ${PAGES_DIR}`)
    process.exit(1)
  }

  // 1. Discover all filesystem routes
  const allFiles = getAllVuePages(PAGES_DIR)
  const allRoutes = allFiles.map(fileToRoute)

  // 2. Filter to auditable routes (non-dynamic, non-excluded)
  const auditableRoutes = allRoutes.filter(r => !isDynamic(r) && !isExcluded(r))
  const dynamicRoutes = allRoutes.filter(isDynamic)
  const excludedRoutes = allRoutes.filter(isExcluded)

  // 3. Load known page_definitions paths from migration files
  const knownPaths = new Set<string>()
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')

  if (existsSync(migrationsDir)) {
    for (const file of readdirSync(migrationsDir)) {
      if (!file.endsWith('.sql')) continue
      const content = readFileSync(join(migrationsDir, file), 'utf-8')
      // Extract paths from INSERT statements
      const pathRegex = /\('(\/[^']*)',\s*'[^']*',\s*'[^']*'/g
      let match
      while ((match = pathRegex.exec(content)) !== null) {
        knownPaths.add(match[1])
      }
    }
  }

  // 4. Find missing pages
  const missingPages = auditableRoutes.filter(r => !knownPaths.has(r))

  // 5. Report
  console.log('═══════════════════════════════════════════════════')
  console.log('  ACCESS MATRIX COMPLETENESS AUDIT')
  console.log('═══════════════════════════════════════════════════')
  console.log()
  console.log(`📁 Total page files:      ${allRoutes.length}`)
  console.log(`🔍 Auditable routes:      ${auditableRoutes.length}`)
  console.log(`🔗 Dynamic routes:        ${dynamicRoutes.length} (inherit parent access)`)
  console.log(`🔓 Excluded routes:       ${excludedRoutes.length} (auth/public)`)
  console.log(`✅ In access matrix:      ${auditableRoutes.length - missingPages.length}`)
  console.log(`❌ MISSING from matrix:   ${missingPages.length}`)
  console.log()

  if (missingPages.length === 0) {
    console.log('✅ All pages are covered by the access matrix!')
    process.exit(0)
  }

  console.log('MISSING PAGES:')
  console.log('─────────────────────────────────────────────────')
  for (const route of missingPages.sort()) {
    const { section } = guessSection(route)
    console.log(`  ❌ ${route.padEnd(40)} → ${section}`)
  }
  console.log()

  if (fixMode) {
    console.log('GENERATED SQL FIX:')
    console.log('─────────────────────────────────────────────────')
    console.log()
    console.log('INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES')
    const lines = missingPages.map((route, i) => {
      const { section, sortOrder } = guessSection(route)
      const name = toDisplayName(route)
      const comma = i < missingPages.length - 1 ? ',' : ''
      return `  ('${route}', '${name}', '${section}', 'mdi-file-document', ${sortOrder}, true)${comma}`
    })
    console.log(lines.join('\n'))
    console.log(`ON CONFLICT (path) DO UPDATE SET`)
    console.log(`  name = EXCLUDED.name,`)
    console.log(`  section = EXCLUDED.section,`)
    console.log(`  sort_order = EXCLUDED.sort_order,`)
    console.log(`  is_active = EXCLUDED.is_active,`)
    console.log(`  updated_at = NOW();`)
    console.log()
    console.log('-- Then run the access assignment block from 20250212000001_complete_page_definitions.sql')
  } else {
    console.log('💡 Run with --fix to generate SQL: npx tsx scripts/audit-page-coverage.ts --fix')
  }

  // Exit with error code so CI fails
  process.exit(1)
}

main()
