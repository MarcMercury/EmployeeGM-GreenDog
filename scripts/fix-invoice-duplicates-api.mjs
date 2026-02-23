/**
 * Fix Invoice Duplicates via Supabase Client API
 *
 * Removes duplicate invoice lines that were inserted because the UNIQUE constraint
 * doesn't catch NULLs. Uses the Supabase JS client (no direct DB access needed).
 *
 * Run: node scripts/fix-invoice-duplicates-api.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const t = line.trim()
  if (t && !t.startsWith('#')) {
    const [key, ...vals] = t.split('=')
    envVars[key] = vals.join('=')
  }
})

const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Generate deterministic dedup key from row fields
function dedupKey(row) {
  return [
    row.invoice_number || '',
    row.invoice_date || '',
    row.product_name || '',
    row.client_code || '',
    String(row.total_earned ?? ''),
    row.staff_member || '',
  ].join('|')
}

async function fix() {
  console.log('🔍 Invoice Deduplication Fix (API Mode)\n')

  // 1. Count rows
  const { count: totalBefore } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
  console.log(`📊 Total invoice lines: ${totalBefore}`)

  const { count: nullCount } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('invoice_line_reference', null)
  console.log(`⚠️  Rows with NULL invoice_line_reference: ${nullCount}`)

  if (!nullCount || nullCount === 0) {
    console.log('✅ No NULL references found — nothing to fix.')
    return
  }

  // 2. Fetch all rows with NULL reference in batches and find duplicates
  console.log('\n📥 Fetching rows to identify duplicates...')

  const PAGE_SIZE = 1000
  const allRows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('invoice_lines')
      .select('id, invoice_number, invoice_date, product_name, client_code, total_earned, staff_member, created_at')
      .is('invoice_line_reference', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('❌ Fetch error:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break
    allRows.push(...data)
    from += PAGE_SIZE

    if (from % 10000 === 0) {
      process.stdout.write(`   Fetched ${allRows.length} rows...\r`)
    }
  }

  console.log(`   Fetched ${allRows.length} rows with NULL reference`)

  // 3. Group by dedup key, mark duplicates (keep the first/oldest)
  const groups = new Map()
  for (const row of allRows) {
    const key = dedupKey(row)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(row.id)
  }

  const duplicateIds = []
  let groupsWithDupes = 0
  for (const [, ids] of groups) {
    if (ids.length > 1) {
      groupsWithDupes++
      // Keep the first (oldest), mark rest as duplicates
      duplicateIds.push(...ids.slice(1))
    }
  }

  console.log(`\n📊 Analysis:`)
  console.log(`   Unique invoice line groups: ${groups.size}`)
  console.log(`   Groups with duplicates: ${groupsWithDupes}`)
  console.log(`   Duplicate rows to remove: ${duplicateIds.length}`)

  if (duplicateIds.length === 0) {
    console.log('\n✅ No duplicates found!')
  } else {
    // 4. Delete duplicates in batches
    console.log(`\n🗑️  Deleting ${duplicateIds.length} duplicate rows...`)
    const DELETE_BATCH = 100
    let deleted = 0

    for (let i = 0; i < duplicateIds.length; i += DELETE_BATCH) {
      const batch = duplicateIds.slice(i, i + DELETE_BATCH)
      const { error } = await supabase
        .from('invoice_lines')
        .delete()
        .in('id', batch)

      if (error) {
        console.error(`   ❌ Delete batch error at ${i}:`, error.message)
      } else {
        deleted += batch.length
      }

      if (deleted % 1000 === 0 || i + DELETE_BATCH >= duplicateIds.length) {
        process.stdout.write(`   Deleted ${deleted} / ${duplicateIds.length}\r`)
      }
    }
    console.log(`\n   ✅ Deleted ${deleted} duplicate rows`)
  }

  // 5. Back-fill NULL invoice_line_reference with deterministic key
  // We can't do a server-side UPDATE with md5 via the REST API,
  // so we fetch remaining NULL rows and update them with a generated reference
  console.log('\n🔧 Back-filling NULL invoice_line_reference...')

  const remainingNulls = []
  from = 0
  while (true) {
    const { data, error } = await supabase
      .from('invoice_lines')
      .select('id, invoice_number, invoice_date, product_name, client_code, total_earned, staff_member')
      .is('invoice_line_reference', null)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('❌ Fetch error:', error.message)
      break
    }
    if (!data || data.length === 0) break
    remainingNulls.push(...data)
    from += PAGE_SIZE
  }

  console.log(`   ${remainingNulls.length} rows need back-fill`)

  const UPDATE_BATCH = 50
  let updated = 0

  for (let i = 0; i < remainingNulls.length; i += UPDATE_BATCH) {
    const batch = remainingNulls.slice(i, i + UPDATE_BATCH)

    // Update each row individually (can't do computed updates in batch via REST)
    const promises = batch.map(row => {
      const key = dedupKey(row)
      // Simple hash
      let hash = 0
      for (let j = 0; j < key.length; j++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(j)
        hash |= 0
      }
      const ref = `AUTO-${Math.abs(hash).toString(36)}`

      return supabase
        .from('invoice_lines')
        .update({ invoice_line_reference: ref })
        .eq('id', row.id)
    })

    const results = await Promise.all(promises)
    const successes = results.filter(r => !r.error).length
    updated += successes

    if (updated % 1000 === 0 || i + UPDATE_BATCH >= remainingNulls.length) {
      process.stdout.write(`   Updated ${updated} / ${remainingNulls.length}\r`)
    }
  }
  console.log(`\n   ✅ Updated ${updated} rows`)

  // 6. Final count
  const { count: totalAfter } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
  console.log(`\n📊 Final summary:`)
  console.log(`   Before: ${totalBefore} rows`)
  console.log(`   After:  ${totalAfter} rows`)
  console.log(`   Removed: ${(totalBefore || 0) - (totalAfter || 0)} duplicates`)

  const { count: nullAfter } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('invoice_line_reference', null)
  console.log(`   Remaining NULLs: ${nullAfter}`)

  console.log('\n✅ Done! Revenue Trend should now show correct monthly values.')
  console.log('   Refresh the Invoice Analysis page to see the fix.')
}

fix().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
