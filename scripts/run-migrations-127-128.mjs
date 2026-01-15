import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigrations() {
  console.log('Running migrations 127 and 128...')
  
  // Read migration files
  const migration127 = fs.readFileSync('supabase/migrations/127_fix_marketing_storage_policies.sql', 'utf8')
  const migration128 = fs.readFileSync('supabase/migrations/128_fix_gdu_rls_policies.sql', 'utf8')
  
  console.log('\n=== Migration 127: Fix Marketing Storage Policies ===')
  console.log('SQL to run manually in Supabase Dashboard SQL Editor:')
  console.log('----------------------------------------------------')
  console.log(migration127)
  
  console.log('\n\n=== Migration 128: Fix GDU RLS Policies ===')
  console.log('SQL to run manually in Supabase Dashboard SQL Editor:')
  console.log('----------------------------------------------------')
  console.log(migration128)
  
  console.log('\n\n=== Instructions ===')
  console.log('1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql')
  console.log('2. Copy each migration above and run it in the SQL Editor')
  console.log('3. After running, the marketing uploads and student CRM should work')
}

runMigrations()
