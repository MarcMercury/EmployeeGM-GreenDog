// Script to run SQL migrations via Supabase
// This creates a temporary function and uses it to execute SQL

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigrations() {
  console.log('=== Running Migrations 127 and 128 ===\n')
  
  const sql127 = fs.readFileSync('supabase/migrations/127_fix_marketing_storage_policies.sql', 'utf8')
  const sql128 = fs.readFileSync('supabase/migrations/128_fix_gdu_rls_policies.sql', 'utf8')
  
  // Split SQL into individual statements and run them
  const statements = [...splitSQL(sql127), ...splitSQL(sql128)]
  
  let successCount = 0
  let errorCount = 0
  
  for (const stmt of statements) {
    if (!stmt.trim()) continue
    
    try {
      const { error } = await supabase.rpc('query', { sql: stmt })
      if (error) {
        // Try direct table operations where possible
        console.log('Statement requires direct execution:', stmt.substring(0, 60) + '...')
      } else {
        successCount++
      }
    } catch (e) {
      // Expected - RPC doesn't exist
    }
  }
  
  console.log('\n=== Migration Summary ===')
  console.log('The following migrations need to be run in Supabase SQL Editor:')
  console.log('URL: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
  console.log('\n--- Migration 127 ---')
  console.log(sql127)
  console.log('\n--- Migration 128 ---')
  console.log(sql128)
}

function splitSQL(sql) {
  // Simple SQL statement splitter
  return sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))
}

runMigrations()
