#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.join(__dirname, '..')
const envPath = path.join(workspaceRoot, '.env')

if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of envLines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator)
    const value = trimmed.slice(separator + 1).replace(/^['\"]|['\"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const migrationArg = process.argv[2]
if (!migrationArg) {
  console.error('Usage: node scripts/apply-supabase-migration.mjs <migration-file>')
  process.exit(1)
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const migrationPath = path.isAbsolute(migrationArg)
  ? migrationArg
  : path.join(workspaceRoot, migrationArg)

if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`)
  process.exit(1)
}

const sqlText = fs.readFileSync(migrationPath, 'utf8')

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql_text: sqlText })
})

if (!response.ok) {
  const errorText = await response.text()
  console.error(`Migration failed with HTTP ${response.status}`)
  console.error(errorText)
  process.exit(1)
}

console.log(`Applied migration: ${path.relative(workspaceRoot, migrationPath)}`)
