#!/usr/bin/env node
/**
 * Apply Migration 132: Fix RLS Policies for clinic_visits and marketing_resources
 * 
 * Usage:
 *   node scripts/apply-migration-132.mjs
 * 
 * Requires environment variables:
 *   SUPABASE_URL or NUXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL (or NUXT_PUBLIC_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying Migration 132: Fix RLS Policies');
  console.log('   - clinic_visits RLS');
  console.log('   - marketing_resources RLS');
  console.log('   - is_admin() and is_marketing_admin() functions');
  console.log('');

  // Read migration file
  const migrationPath = join(__dirname, '../supabase/migrations/132_fix_clinic_visits_marketing_rls.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (handle $$ blocks)
  // For simplicity, we'll run the whole thing at once
  // Supabase's execute function should handle it
  
  try {
    // We need to use the REST API to execute raw SQL
    // Use the /rest/v1/rpc endpoint is not suitable for DDL
    // Instead, we'll connect via pg-client or use supabase sql editor
    
    console.log('📋 Migration SQL prepared. To apply this migration:');
    console.log('');
    console.log('Option 1: Run in Supabase Dashboard SQL Editor');
    console.log('   1. Go to your Supabase project');
    console.log('   2. Open SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log('      supabase/migrations/132_fix_clinic_visits_marketing_rls.sql');
    console.log('   4. Execute the migration');
    console.log('');
    console.log('Option 2: Use Supabase CLI (if configured)');
    console.log('   npx supabase db push');
    console.log('');
    
    // Let's at least verify we can connect
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Connection to Supabase verified');
    console.log('');
    console.log('📄 Migration content preview:');
    console.log('─'.repeat(60));
    console.log(migrationSql.substring(0, 500) + '\n...(truncated)');
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
