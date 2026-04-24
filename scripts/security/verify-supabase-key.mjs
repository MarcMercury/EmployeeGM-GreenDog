#!/usr/bin/env node
/**
 * Verify Supabase service-role key
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env (or argv) and
 * confirms the key can authenticate against the project by:
 *   1. Hitting /rest/v1/?apikey=... and expecting HTTP 200/2xx
 *   2. Decoding the JWT and printing role + project ref + expiry
 *
 * Used by the rotate-supabase-key workflow as a pre/post-flight check.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/security/verify-supabase-key.mjs
 *   node scripts/security/verify-supabase-key.mjs <url> <key>
 */

const [argUrl, argKey] = process.argv.slice(2)
const SUPABASE_URL = argUrl || process.env.SUPABASE_URL
const SUPABASE_KEY = argKey || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4)
    const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function main() {
  const payload = decodeJwtPayload(SUPABASE_KEY)
  if (!payload) {
    console.error('❌ Key does not look like a Supabase JWT')
    process.exit(3)
  }

  const projectRef = payload.ref
  const role = payload.role
  const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'
  const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)
  const urlRef = urlMatch ? urlMatch[1] : null

  console.log(`• Project ref (URL):    ${urlRef ?? '?'}`)
  console.log(`• Project ref (token):  ${projectRef ?? '?'}`)
  console.log(`• Role:                 ${role ?? '?'}`)
  console.log(`• Token expires:        ${exp}`)

  if (urlRef && projectRef && urlRef !== projectRef) {
    console.error('❌ URL project ref does not match token project ref')
    process.exit(4)
  }

  if (role !== 'service_role') {
    console.warn(`⚠️  Token role is "${role}", expected "service_role"`)
  }

  // Live check
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
  })

  if (!res.ok) {
    console.error(`❌ Live check failed: HTTP ${res.status} ${res.statusText}`)
    process.exit(5)
  }

  console.log(`✅ Key is valid and reachable (HTTP ${res.status})`)
}

main().catch(err => {
  console.error('❌ Unexpected error:', err?.message ?? err)
  process.exit(1)
})
