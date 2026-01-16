/**
 * Apply EzyVet CRM Migration via direct SQL execution
 */

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

async function executeSql(sql: string, label: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({})
  })
  return response
}

async function main() {
  console.log('=' .repeat(60))
  console.log('APPLYING EZYVET CRM MIGRATION')
  console.log('=' .repeat(60))
  console.log()

  // Use the management API to execute SQL
  const managementUrl = 'https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query'
  const accessToken = 'sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39'

  const statements = [
    // 1. Create contacts table
    `CREATE TABLE IF NOT EXISTS ezyvet_crm_contacts (
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
    )`,

    // 2. Create sync history table
    `CREATE TABLE IF NOT EXISTS ezyvet_sync_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sync_type TEXT NOT NULL DEFAULT 'csv_import',
      started_at TIMESTAMPTZ DEFAULT now(),
      completed_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'running',
      total_rows INTEGER DEFAULT 0,
      inserted_count INTEGER DEFAULT 0,
      updated_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      error_details JSONB,
      triggered_by TEXT,
      file_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    // 3. Create indexes
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_code ON ezyvet_crm_contacts(ezyvet_contact_code)`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_email ON ezyvet_crm_contacts(email) WHERE email IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_revenue ON ezyvet_crm_contacts(revenue_ytd DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_active ON ezyvet_crm_contacts(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_city ON ezyvet_crm_contacts(address_city) WHERE address_city IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_last_visit ON ezyvet_crm_contacts(last_visit DESC NULLS LAST)`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_referral ON ezyvet_crm_contacts(referral_source) WHERE referral_source IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_division ON ezyvet_crm_contacts(division) WHERE division IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_ezyvet_sync_history_status ON ezyvet_sync_history(status, started_at DESC)`,

    // 4. Enable RLS
    `ALTER TABLE ezyvet_crm_contacts ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE ezyvet_sync_history ENABLE ROW LEVEL SECURITY`,

    // 5. Create RLS policies (drop first to be idempotent)
    `DROP POLICY IF EXISTS "Admin read ezyvet contacts" ON ezyvet_crm_contacts`,
    `CREATE POLICY "Admin read ezyvet contacts" ON ezyvet_crm_contacts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))`,
    `DROP POLICY IF EXISTS "Admin manage ezyvet contacts" ON ezyvet_crm_contacts`,
    `CREATE POLICY "Admin manage ezyvet contacts" ON ezyvet_crm_contacts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))`,
    `DROP POLICY IF EXISTS "Admin read ezyvet sync history" ON ezyvet_sync_history`,
    `CREATE POLICY "Admin read ezyvet sync history" ON ezyvet_sync_history FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))`,
    `DROP POLICY IF EXISTS "Admin manage ezyvet sync history" ON ezyvet_sync_history`,
    `CREATE POLICY "Admin manage ezyvet sync history" ON ezyvet_sync_history FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role IN ('admin', 'super_admin')))`
  ]

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i]
    const label = sql.substring(0, 50).replace(/\s+/g, ' ')
    
    console.log(`[${i + 1}/${statements.length}] Executing: ${label}...`)
    
    try {
      const response = await fetch(managementUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      })

      if (!response.ok) {
        const text = await response.text()
        console.log(`    ⚠️ API response: ${response.status} - ${text.substring(0, 100)}`)
      } else {
        console.log(`    ✅ Success`)
      }
    } catch (error: any) {
      console.log(`    ❌ Error: ${error.message}`)
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('Migration script completed.')
  console.log('\nIf tables were not created, please run the SQL manually in Supabase Dashboard:')
  console.log('  1. Go to https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql')
  console.log('  2. Paste contents of: supabase/migrations/134_ezyvet_crm_system.sql')
  console.log('  3. Click "Run"')
}

main().catch(console.error)
