#!/usr/bin/env node
/**
 * Apply EzyVet CRM Migration via Supabase REST API
 */

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

async function main() {
  console.log('Testing Supabase connection and table access...\n')

  // Test connection by listing tables
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  })

  if (response.ok) {
    const data = await response.json()
    console.log('Available endpoints:', Object.keys(data?.definitions || {}).slice(0, 10))
    
    // Check if our table exists
    if (data?.definitions?.ezyvet_crm_contacts) {
      console.log('\n✅ ezyvet_crm_contacts table exists!')
    } else {
      console.log('\n❌ ezyvet_crm_contacts table does NOT exist')
      console.log('\nPlease apply the migration manually:')
      console.log('1. Go to https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql')
      console.log('2. Paste the contents of: supabase/migrations/134_ezyvet_crm_system.sql')
      console.log('3. Click "Run"')
    }
  } else {
    console.log('Connection test failed:', response.status)
  }
}

main().catch(console.error)
