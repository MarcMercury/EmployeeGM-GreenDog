#!/usr/bin/env node

import fs from 'fs';

// Get credentials from environment or file
const credentials = {
  projectId: 'uekumyupkhnpjpdcjfxb',
  url: 'https://uekumyupkhnpjpdcjfxb.supabase.co',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

if (!credentials.serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nTo fix, get the key from: docs/SUPABASE_CREDENTIALS.md');
  console.error('Then run:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY="<key-from-credentials>"');
  console.error('node scripts/push-rls-fix-direct.mjs\n');
  process.exit(1);
}

async function executeSql(sql) {
  try {
    const response = await fetch(`${credentials.url}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.serviceRoleKey}`,
        'Content-Type': 'application/json',
        'X-Client-Info': 'safety-logs-rls-fix/1.0',
      },
      body: JSON.stringify({ query: sql }),
    });

    return response;
  } catch (error) {
    throw error;
  }
}

async function applyRLSFix() {
  console.log('🚀 Pushing RLS Fix to Supabase...\n');

  try {
    // Read the RLS fix SQL
    const sqlPath = './supabase/migrations/20260219100000_final_safety_logs_rls_fix.sql';
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 RLS Fix SQL File: 20260219100000_final_safety_logs_rls_fix.sql');
    console.log('📊 File Size:', (sqlContent.length / 1024).toFixed(2), 'KB\n');

    // Since REST API doesn't support raw SQL execution directly,
    // we need to use a different approach.
    // The most reliable method is the SQL Editor.

    console.log('ℹ️  Method: Manual SQL Editor Push (Most Reliable)\n');
    console.log('═'.repeat(70));
    console.log('SUPABASE RLS FIX SQL:');
    console.log('═'.repeat(70));
    console.log(sqlContent);
    console.log('═'.repeat(70));

    console.log('\n✅ Instructions:');
    console.log('─'.repeat(70));
    console.log('1. Copy ALL the SQL above ⬆️ (lines between ═)');
    console.log('2. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
    console.log('3. Paste the SQL into the editor');
    console.log('4. Click the "Run" button');
    console.log('5. Wait for the operation to complete');
    console.log('6. You should see 5 policy rows returned:');
    console.log('   • safety_logs_delete_admins');
    console.log('   • safety_logs_insert_own');
    console.log('   • safety_logs_select_managers');
    console.log('   • safety_logs_select_own');
    console.log('   • safety_logs_update_managers');
    console.log('7. Hard refresh your app (Ctrl+Shift+R)');
    console.log('8. Test: Navigate to safety logs and try submitting');
    console.log('─'.repeat(70));

    console.log('\n✨ After applying the SQL, safety logs will work!\n');

    // Write the SQL to a temp file for easy copying
    const tempSqlPath = '/tmp/safety-logs-rls-fix.sql';
    fs.writeFileSync(tempSqlPath, sqlContent, 'utf8');
    console.log(`📌 SQL also saved to: ${tempSqlPath}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyRLSFix();
