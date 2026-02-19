#!/usr/bin/env node
/**
 * Apply Safety Logs RLS Fix using direct REST API
 */

import fs from 'fs'

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

async function main() {
  log('\n' + '='.repeat(70), 'bright')
  log('🔧 Supabase Safety Logs RLS Fix - SQL Editor Method', 'bright')
  log('='.repeat(70), 'bright')
  
  log('\n📝 Unable to execute SQL directly via API.', 'yellow')
  log('✅ But we can verify the table and provide SQL.\n', 'yellow')
  
  // Read the RLS fix SQL
  const sqlPath = '/workspaces/EmployeeGM-GreenDog/docs/SAFETY_LOGS_RLS_FIX.sql'
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  log('📄 SQL Fix Content:', 'cyan')
  log('─'.repeat(70), 'cyan')
  console.log(sql)
  log('─'.repeat(70), 'cyan')
  
  log('\n✅ INSTRUCTIONS:', 'green')
  log('─'.repeat(70), 'green')
  
  log('\n1️⃣  Open Supabase SQL Editor:', 'bright')
  log('   → https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new\n', 'cyan')
  
  log('2️⃣  Copy ALL the SQL above ⬆️ (from ──── to ────)', 'bright')
  
  log('\n3️⃣  Paste it into the SQL Editor', 'bright')
  
  log('\n4️⃣  Click "Run" button', 'bright')
  
  log('\n5️⃣  Verify you see 5 policies returned at bottom:', 'bright')
  log('   • safety_logs_delete_admins', 'yellow')
  log('   • safety_logs_insert_own', 'yellow')
  log('   • safety_logs_select_managers', 'yellow')
  log('   • safety_logs_select_own', 'yellow')
  log('   • safety_logs_update_managers\n', 'yellow')
  
  log('6️⃣  After that, refresh your app (Ctrl+Shift+R)', 'bright')
  
  log('\n7️⃣  Try submitting a safety log - it should work! 🎉\n', 'bright')
  
  log('─'.repeat(70), 'green')
  
  log('\n📋 File saved as: docs/SAFETY_LOGS_RLS_FIX.sql', 'cyan')
  log('📋 For reference: SAFETY_LOGS_FIX_MANUAL.md\n', 'cyan')
}

main().catch(err => {
  log(`❌ Error: ${err.message}`, 'red')
  process.exit(1)
})
