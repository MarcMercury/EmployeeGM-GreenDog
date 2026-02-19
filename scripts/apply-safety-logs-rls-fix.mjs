#!/usr/bin/env node
/**
 * Apply safety_logs RLS policy fix
 * This fixes the issue where submitted_by field (profile UUID) was being
 * compared to auth.uid() (auth user UUID) instead of properly joining via profiles table
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL || 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🔧 Applying safety_logs RLS policy fix migration...\n')
  
  const sql = fs.readFileSync('supabase/migrations/20260219_fix_safety_logs_rls.sql', 'utf8')
  
  console.log('📄 Migration SQL:')
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  console.log()
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`📋 Found ${statements.length} SQL statements to execute\n`)
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';'
    const preview = stmt.substring(0, 80).replace(/\s+/g, ' ')
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`)
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt })
      
      if (error) {
        // RPC might not exist, try alternative method
        console.log(`   ⚠️  RPC failed: ${error.message}`)
        errorCount++
      } else {
        console.log('   ✅ Success')
        successCount++
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`)
      errorCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log()
  
  if (errorCount > 0) {
    console.log('⚠️  Some statements failed. You may need to run this migration manually.')
    console.log('📝 Copy the migration SQL from:')
    console.log('   supabase/migrations/20260219_fix_safety_logs_rls.sql')
    console.log()
    console.log('🔗 Run it in Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
    console.log()
  } else {
    console.log('✨ Migration applied successfully!')
    console.log('🔄 Please refresh your app and try submitting a log entry again.')
  }
}

applyMigration().catch(err => {
  console.error('💥 Migration failed:', err)
  process.exit(1)
})
