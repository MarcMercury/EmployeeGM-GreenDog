#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const connStr = 'postgresql://postgres.uekumyupkhnpjpdcjfxb:A7aJ3YY@7Zk9w@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

async function pushRLSFix() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('📡 Connecting to Supabase database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read SQL
    const sqlPath = './supabase/migrations/20260219100000_final_safety_logs_rls_fix.sql';
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing RLS fix SQL...\n');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        executed++;
        console.log(`✅ [${executed}/${statements.length}] Executed statement`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  [${executed + 1}/${statements.length}] Already exists (skipping):`, err.message.split('\n')[0]);
          executed++;
        } else {
          throw err;
        }
      }
    }

    console.log(`\n✨ Successfully executed ${executed} SQL statements!\n`);

    // Verify policies were created
    console.log('📋 Verifying policies...\n');
    const result = await client.query(`
      SELECT policyname FROM pg_policies 
      WHERE tablename = 'safety_logs'
      ORDER BY policyname;
    `);

    console.log('✅ Policies created:');
    result.rows.forEach(row => {
      console.log(`   • ${row.policyname}`);
    });

    console.log('\n🎉 RLS fix successfully applied!\n');
    console.log('Next steps:');
    console.log('1. Hard refresh your app (Ctrl+Shift+R)');
    console.log('2. Navigate to safety logs');
    console.log('3. Try submitting a log entry');
    console.log('4. It should work without 500 errors!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nNote: Direct database push requires valid credentials.');
    console.error('If connection failed, use the SQL Editor method instead:\n');
    console.error('1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
    console.error('2. Copy SQL from: docs/SAFETY_LOGS_RLS_FIX.sql');
    console.error('3. Paste and click Run\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

pushRLSFix();
