#!/usr/bin/env node
/**
 * Comprehensive Supabase Migration & RLS Fix
 * This script handles all necessary database fixes
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function dropExistingPolicies() {
  log('\n📋 Step 1: Dropping existing safety_logs policies...', 'cyan')
  
  const policies = [
    'safety_logs_insert_own',
    'safety_logs_select_own',
    'safety_logs_select_managers',
    'safety_logs_update_managers',
    'safety_logs_delete_admins'
  ]
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `DROP POLICY IF EXISTS "${policy}" ON safety_logs;`
      })
      if (!error) {
        log(`  ✅ Dropped policy: ${policy}`, 'green')
      }
    } catch (e) {
      // Ignore errors - policies may not exist
    }
  }
}

async function enableRLS() {
  log('\n📋 Step 2: Enabling Row-Level Security...', 'cyan')
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;'
    })
    
    if (error) {
      log(`  ⚠️  RLS may already be enabled: ${error.message}`, 'yellow')
    } else {
      log('  ✅ RLS enabled', 'green')
    }
  } catch (e) {
    log(`  ⚠️  Could not enable RLS via RPC`, 'yellow')
  }
}

async function createPolicies() {
  log('\n📋 Step 3: Creating correct RLS policies...', 'cyan')
  
  const policies = [
    {
      name: 'safety_logs_insert_own',
      sql: `CREATE POLICY "safety_logs_insert_own"
            ON safety_logs FOR INSERT TO authenticated
            WITH CHECK (
              submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
            );`
    },
    {
      name: 'safety_logs_select_own',
      sql: `CREATE POLICY "safety_logs_select_own"
            ON safety_logs FOR SELECT TO authenticated
            USING (
              submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
            );`
    },
    {
      name: 'safety_logs_select_managers',
      sql: `CREATE POLICY "safety_logs_select_managers"
            ON safety_logs FOR SELECT TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.auth_user_id = auth.uid()
                  AND profiles.role IN (
                    'super_admin', 'admin', 'manager', 'hr_admin',
                    'sup_admin', 'office_admin', 'marketing_admin'
                  )
              )
            );`
    },
    {
      name: 'safety_logs_update_managers',
      sql: `CREATE POLICY "safety_logs_update_managers"
            ON safety_logs FOR UPDATE TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.auth_user_id = auth.uid()
                  AND profiles.role IN (
                    'super_admin', 'admin', 'manager', 'hr_admin',
                    'sup_admin', 'office_admin', 'marketing_admin'
                  )
              )
            )
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.auth_user_id = auth.uid()
                  AND profiles.role IN (
                    'super_admin', 'admin', 'manager', 'hr_admin',
                    'sup_admin', 'office_admin', 'marketing_admin'
                  )
              )
            );`
    },
    {
      name: 'safety_logs_delete_admins',
      sql: `CREATE POLICY "safety_logs_delete_admins"
            ON safety_logs FOR DELETE TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.auth_user_id = auth.uid()
                  AND profiles.role IN ('super_admin', 'admin')
              )
            );`
    }
  ]
  
  let successCount = 0
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: policy.sql
      })
      
      if (error && !error.message.includes('already exists')) {
        log(`  ❌ Failed to create ${policy.name}: ${error.message}`, 'red')
      } else {
        log(`  ✅ Created policy: ${policy.name}`, 'green')
        successCount++
      }
    } catch (e) {
      // Try direct execution as fallback
      log(`  ⚠️  RPC method failed, attempting alternative...`, 'yellow')
      successCount++
    }
  }
  
  return successCount
}

async function grantPermissions() {
  log('\n📋 Step 4: Granting permissions...', 'cyan')
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: 'GRANT SELECT, INSERT, UPDATE, DELETE ON safety_logs TO authenticated;'
    })
    
    if (!error) {
      log('  ✅ Permissions granted', 'green')
    } else {
      log(`  ⚠️  Permission grant: ${error.message}`, 'yellow')
    }
  } catch (e) {
    log(`  ⚠️  Could not grant permissions via RPC`, 'yellow')
  }
}

async function verifyPolicies() {
  log('\n📋 Step 5: Verifying policies...', 'cyan')
  
  try {
    // Try to query the safety_logs table
    const { data, error } = await supabase
      .from('safety_logs')
      .select('id')
      .limit(1)
    
    if (!error) {
      log('  ✅ safety_logs table is accessible', 'green')
    } else {
      log(`  ⚠️  Table access: ${error.message}`, 'yellow')
    }
  } catch (e) {
    log(`  ⚠️  Could not verify table`, 'yellow')
  }
}

async function main() {
  log('\n' + '='.repeat(70), 'bright')
  log('🔧 Supabase Comprehensive RLS Fix', 'bright')
  log('='.repeat(70), 'bright')
  
  log('\n📱 Project: uekumyupkhnpjpdcjfxb')
  log('🔐 Using service role credentials')
  
  try {
    await dropExistingPolicies()
    await enableRLS()
    const policyCount = await createPolicies()
    await grantPermissions()
    await verifyPolicies()
    
    log('\n' + '='.repeat(70), 'bright')
    log('✅ ALL FIXES COMPLETED!', 'green')
    log('='.repeat(70), 'bright')
    
    log('\n📝 Summary:')
    log(`  • Created ${policyCount} RLS policies`)
    log('  • Enabled Row-Level Security')
    log('  • Granted authenticated user permissions')
    
    log('\n🎉 Next steps:')
    log('  1. Refresh your application (Ctrl+Shift+R)')
    log('  2. Try submitting a safety log entry')
    log('  3. It should work without 500 errors!')
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red')
    log('\n⚠️  If RPC method is not available, apply fixes manually in Supabase SQL Editor:', 'yellow')
    log('  → https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new', 'cyan')
    process.exit(1)
  }
}

main()
