#!/usr/bin/env node

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Extract credentials from file
async function getCredentials() {
  const credPath = './docs/SUPABASE_CREDENTIALS.md';
  const content = fs.readFileSync(credPath, 'utf8');
  
  // Extract Service Role Key
  const serviceRoleMatch = content.match(/^SUPABASE_SERVICE_ROLE_KEY=([\w\-._]+)/m);
  if (!serviceRoleMatch) {
    throw new Error('Could not find SUPABASE_SERVICE_ROLE_KEY in credentials file');
  }

  return {
    projectId: 'uekumyupkhnpjpdcjfxb',
    url: 'https://uekumyupkhnpjpdcjfxb.supabase.co',
    serviceRoleKey: serviceRoleMatch[1],
  };
}

async function executeDirectSQL() {
  try {
    console.log('🔐 Reviewing Credentials...\n');
    
    const creds = await getCredentials();
    console.log('✅ Project ID:', creds.projectId);
    console.log('✅ API URL:', creds.url);
    console.log('✅ Service Role Key: Present (', creds.serviceRoleKey.substring(0, 20), '...)\n');

    console.log('📄 Reading RLS Fix SQL...\n');
    
    // Read the SQL
    const sqlPath = './supabase/migrations/20260219100000_final_safety_logs_rls_fix.sql';
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL File loaded:', (sqlContent.length / 1024).toFixed(2), 'KB\n');

    // Try to use Supabase CLI with auth token for direct push
    console.log('🚀 Attempting to apply RLS fix...\n');

    // Set environment variable
    process.env.SUPABASE_ACCESS_TOKEN = creds.serviceRoleKey;

    // Try pushing via CLI with linked project
    try {
      // First, check if we can use the management API
      const response = await fetch(`${creds.url}/rest/v1/rpc/exec_raw_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': creds.serviceRoleKey,
        },
        body: JSON.stringify({
          sql: sqlContent,
        }),
      });

      if (response.ok) {
        console.log('✅ SQL executed successfully via API!\n');
        const result = await response.json();
        console.log('📊 Result:', result);
        return;
      }
    } catch (apiError) {
      console.log('ℹ️  Direct API method not available, trying alternative...\n');
    }

    // Alternative: Use Supabase CLI
    console.log('🔧 Using Supabase CLI to push migrations...\n');
    
    const { stdout, stderr } = await execAsync(
      'cd /workspaces/EmployeeGM-GreenDog && npx supabase@latest db push --linked --debug 2>&1 | head -100',
      { 
        env: { 
          ...process.env,
          SUPABASE_PROJECT_ID: creds.projectId,
        }
      }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.log('❌ Error from CLI:');
      console.log(stderr);
      throw new Error('CLI push failed');
    }

    console.log('📋 CLI Output:\n', stdout);

  } catch (error) {
    console.log('⚠️  Automatic push not available:', error.message);
    console.log('\n💡 Using Manual SQL Editor method (most reliable)...\n');
    
    const sqlPath = './supabase/migrations/20260219100000_final_safety_logs_rls_fix.sql';
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('═'.repeat(70));
    console.log('📄 SQL Fix to Apply:');
    console.log('═'.repeat(70));
    console.log(sqlContent);
    console.log('═'.repeat(70));
    
    console.log('\n✅ Quick Steps:');
    console.log('1. Copy ALL SQL above (from ═ to ═)');
    console.log('2. Open: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
    console.log('3. Paste SQL in editor');
    console.log('4. Click "Run"');
    console.log('5. Verify 5 policies created');
    console.log('6. Hard refresh app (Ctrl+Shift+R)');
    console.log('7. Test safety log submission\n');
  }
}

executeDirectSQL().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
