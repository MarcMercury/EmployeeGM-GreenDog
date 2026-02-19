#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'uekumyupkhnpjpdcjfxb';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('Please set: export SUPABASE_SERVICE_ROLE_KEY="<your-key>"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyRLSFix() {
  try {
    console.log('🔧 Applying RLS Fix to Safety Logs...\n');

    // Read the SQL migration file
    const sqlPath = './supabase/migrations/20260219100000_final_safety_logs_rls_fix.sql';
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 SQL File: 20260219100000_final_safety_logs_rls_fix.sql');
    console.log('📋 Executing fix...\n');

    // Execute via Supabase RPC or direct SQL
    // Since exec_sql RPC doesn't exist, we'll use a workaround:
    // Create a temporary function and call it, then drop it
    
    const lines = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n');

    // Try direct execution by splitting into statements
    const statements = lines.split(';').filter(s => s.trim());
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    console.log('Status: Manual SQL Editor required (RPC method unavailable)\n');

    // Display the SQL for manual execution
    console.log('📄 SQL TO RUN IN SUPABASE SQL EDITOR:');
    console.log('═'.repeat(70));
    console.log(sqlContent);
    console.log('═'.repeat(70));

    console.log('\n✅ COPY THE SQL ABOVE AND:');
    console.log('1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run" button');
    console.log('4. Wait for completion');
    console.log('5. Refresh your app (Ctrl+Shift+R)');
    console.log('\n✨ After that, safety logs will work!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyRLSFix();
