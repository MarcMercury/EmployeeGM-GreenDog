import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function applyMigration129() {
  console.log('🔧 Applying Migration 129 Columns\n')
  console.log('='.repeat(70))

  // Step 1: Add hr_only to employee_notes
  console.log('\n📦 Step 1: Adding hr_only to employee_notes...')
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.employee_notes ADD COLUMN IF NOT EXISTS hr_only BOOLEAN DEFAULT false;`
  }).maybeSingle()
  
  if (e1) {
    console.log('   Using direct query approach...')
    // Try using raw fetch since RPC might not exist
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        sql: `ALTER TABLE public.employee_notes ADD COLUMN IF NOT EXISTS hr_only BOOLEAN DEFAULT false;`
      })
    })
    console.log('   Response:', response.status)
  } else {
    console.log('   ✅ Done')
  }

  // Check current columns
  console.log('\n📋 Checking current employee_notes columns...')
  const { data: notesCols } = await supabase
    .from('employee_notes')
    .select('*')
    .limit(0)
  
  console.log('   employee_notes accessible:', notesCols !== null)

  // Check employees table
  console.log('\n📋 Checking employees table for new columns...')
  const { data: empData, error: empErr } = await supabase
    .from('employees')
    .select('id, needs_user_account, onboarding_status')
    .limit(1)
  
  if (empErr) {
    console.log('   ❌ Missing columns:', empErr.message)
  } else {
    console.log('   ✅ Columns exist - sample:', empData?.[0])
  }

  // Check candidates table
  console.log('\n📋 Checking candidates table for new columns...')
  const { data: candData, error: candErr } = await supabase
    .from('candidates')
    .select('id, source_person_id, source_enrollment_id, conversion_source')
    .limit(1)
  
  if (candErr) {
    console.log('   ❌ Missing columns:', candErr.message)
  } else {
    console.log('   ✅ Columns exist - sample:', candData?.[0])
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n⚠️  Since Supabase JS client cannot run ALTER TABLE directly,')
  console.log('   you need to run this SQL in the Supabase SQL Editor:\n')
  
  const sql = `
-- Migration 129 Missing Columns

-- 1. employee_notes.hr_only
ALTER TABLE public.employee_notes 
ADD COLUMN IF NOT EXISTS hr_only BOOLEAN DEFAULT false;

-- 2. candidates source tracking
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS source_person_id UUID,
ADD COLUMN IF NOT EXISTS source_enrollment_id UUID,
ADD COLUMN IF NOT EXISTS conversion_source TEXT;

-- 3. employees user account tracking
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS needs_user_account BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_created_by UUID,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';
`
  console.log(sql)
  console.log('\n🔗 Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
}

applyMigration129().catch(console.error)
