#!/usr/bin/env node
/**
 * Check which migrations are already applied in Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkMigrations() {
  console.log('📊 Checking applied migrations...\n')
  
  // Query the schema_migrations table
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .order('version', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('No migrations found')
    return  
  }
  
  console.log(`✅ Found ${data.length} applied migrations (latest):`)
  console.log('')
  
  data.forEach((row, index) => {
    console.log(`${index + 1}. ${row.version}`)
  })
  
  console.log('\n📝 Migrations with "204" and later are:')
  data.forEach((row) => {
    if (row.version >= '204' || row.version.includes('2025') || row.version.includes('2026')) {
      console.log(`   • ${row.version}`)
    }
  })
}

checkMigrations().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
