#!/usr/bin/env node
/**
 * Secret Sentinel
 *
 * Scans source files for likely hardcoded secrets.
 * By default in CI, scan only changed files to avoid blocking legacy code.
 * Use --full to scan all tracked files under the configured roots.
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SCAN_ROOTS = ['app', 'server', 'scripts', '.github']
const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue', '.py', '.sh', '.sql', '.yml', '.yaml', '.json',
])

const SUSPICIOUS_PATTERNS = [
  {
    name: 'Supabase JWT-like token literal',
    // Any long HS256 JWT assignment likely to be a real key in scripts.
    regex: /(SUPABASE|SERVICE|SECRET|API|TOKEN|KEY)[\w]*\s*=\s*['"][A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"]/g,
  },
  {
    name: 'Bearer token hardcoded',
    regex: /Bearer\s+[A-Za-z0-9._-]{24,}/g,
  },
  {
    name: 'OpenAI key literal',
    regex: /sk-[A-Za-z0-9]{20,}/g,
  },
]

function isAllowedExtension(filePath) {
  for (const ext of ALLOWED_EXTENSIONS) {
    if (filePath.endsWith(ext)) return true
  }
  return false
}

function inScanRoots(filePath) {
  return SCAN_ROOTS.some(root => filePath === root || filePath.startsWith(`${root}/`))
}

function getChangedFiles(baseRef, headRef) {
  const output = execSync(`git diff --name-only ${baseRef} ${headRef}`, { encoding: 'utf8' }).trim()
  if (!output) return []
  return output
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean)
}

function getTrackedFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' }).trim()
  if (!output) return []
  return output
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean)
}

function detectSecrets(filePath) {
  let text = ''
  try {
    text = readFileSync(resolve(filePath), 'utf8')
  } catch {
    return []
  }

  // Skip explicit env-var usage lines to reduce false positives.
  if (text.includes('process.env.') && !text.match(/=\s*['"][A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"]/)) {
    // Keep scanning; this just avoids an early false positive path.
  }

  const findings = []
  for (const pattern of SUSPICIOUS_PATTERNS) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      const matchText = match[0]
      if (matchText.includes('process.env')) continue

      const line = text.slice(0, match.index).split('\n').length
      findings.push({
        file: filePath,
        line,
        rule: pattern.name,
      })
    }
  }

  return findings
}

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  return {
    full: args.has('--full'),
  }
}

function main() {
  const { full } = parseArgs()
  const baseRef = process.env.SECRET_SENTINEL_BASE || 'HEAD~1'
  const headRef = process.env.SECRET_SENTINEL_HEAD || 'HEAD'

  const candidates = full ? getTrackedFiles() : getChangedFiles(baseRef, headRef)
  const filesToScan = candidates
    .filter(inScanRoots)
    .filter(isAllowedExtension)
    .filter(f => existsSync(resolve(f)))

  if (filesToScan.length === 0) {
    console.log('Secret Sentinel: no matching files to scan.')
    return
  }

  const findings = filesToScan.flatMap(detectSecrets)

  if (findings.length === 0) {
    console.log(`Secret Sentinel: scanned ${filesToScan.length} file(s), no secrets detected.`)
    return
  }

  console.error('Secret Sentinel detected potential hardcoded secrets:')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}]`)
  }
  process.exit(1)
}

main()
