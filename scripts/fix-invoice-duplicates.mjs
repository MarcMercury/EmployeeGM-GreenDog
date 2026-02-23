/**
 * Apply Invoice Deduplication Fix
 *
 * This script removes duplicate invoice lines that were inserted because
 * PostgreSQL UNIQUE constraints treat NULLs as distinct values.
 * Rows with NULL invoice_line_reference bypassed the dedup check.
 *
 * Run: node scripts/fix-invoice-duplicates.mjs
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

async function fix() {
  console.log('🔍 Invoice Deduplication Fix\n')

  // 1. Count total rows before
  const { count: beforeCount } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
  console.log(`📊 Total invoice lines before fix: ${beforeCount}`)

  // 2. Count rows with NULL invoice_line_reference
  const { count: nullCount } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('invoice_line_reference', null)
  console.log(`⚠️  Rows with NULL invoice_line_reference: ${nullCount}`)

  // 3. Apply the migration SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260223000001_fix_invoice_duplicates.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('\n🔧 Applying fix...')
  console.log('   Step 1: Removing duplicate rows (keeping earliest)...')
  console.log('   Step 2: Back-filling NULL invoice_line_reference...')
  console.log('   Step 3: Removing newly-surfaced duplicates...')
  console.log('   Step 4: Adding stronger unique index...\n')

  // Execute SQL via the exec_sql RPC if available, otherwise guide manual application
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql })

  if (error) {
    // exec_sql may not exist — provide manual instructions
    if (error.message.includes('function') || error.code === '42883') {
      console.log('⚠️  exec_sql function not available. Apply the migration manually:\n')
      console.log('1. Open: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
      console.log(`2. Copy contents of: supabase/migrations/20260223000001_fix_invoice_duplicates.sql`)
      console.log('3. Paste into SQL editor and click "Run"\n')
      console.log('--- SQL to run ---\n')
      console.log(sql)
      console.log('\n--- End SQL ---')
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }

  // 4. Count total rows after
  const { count: afterCount } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
  console.log(`✅ Total invoice lines after fix: ${afterCount}`)
  console.log(`🗑️  Duplicates removed: ${(beforeCount || 0) - (afterCount || 0)}`)

  // 5. Verify no more NULLs
  const { count: nullAfter } = await supabase
    .from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('invoice_line_reference', null)
  console.log(`✓ Remaining NULL invoice_line_reference: ${nullAfter}`)

  console.log('\n✅ Fix complete! Revenue Trend should now display correctly.')
}

fix().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
