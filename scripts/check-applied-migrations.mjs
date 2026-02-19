#!/usr/bin/env node
/**
 * Check which migrations are already applied in Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

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
