/**
 * Apply EzyVet CRM Migration
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('Creating EzyVet CRM tables...')

  // Create the main contacts table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ezyvet_crm_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ezyvet_contact_code TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone_mobile TEXT,
        address_city TEXT,
        address_zip TEXT,
        revenue_ytd NUMERIC(12, 2) DEFAULT 0,
        last_visit DATE,
        division TEXT,
        referral_source TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        last_sync_at TIMESTAMPTZ DEFAULT now()
      );
    `
  })

  if (tableError && !tableError.message?.includes('already exists')) {
    // Try direct insert to verify connection
    console.log('RPC not available, testing direct access...')
  }

  // Test if table exists by trying to select from it
  const { data, error: selectError } = await supabase
    .from('ezyvet_crm_contacts')
    .select('id')
    .limit(1)

  if (selectError && selectError.code === '42P01') {
    console.log('Table does not exist yet. Creating via SQL...')
    // Table doesn't exist - need to create it manually via Supabase dashboard
    console.log('\n⚠️  Please run the migration SQL in Supabase Dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and run the migration from: supabase/migrations/134_ezyvet_crm_system.sql')
  } else if (selectError) {
    console.log('Error checking table:', selectError.message)
  } else {
    console.log('✅ ezyvet_crm_contacts table exists!')
    console.log(`   Current rows: ${data?.length || 0}`)
  }

  // Also check sync history table
  const { error: syncError } = await supabase
    .from('ezyvet_sync_history')
    .select('id')
    .limit(1)

  if (syncError && syncError.code === '42P01') {
    console.log('❌ ezyvet_sync_history table does not exist')
  } else if (!syncError) {
    console.log('✅ ezyvet_sync_history table exists!')
  }
}

main().catch(console.error)
