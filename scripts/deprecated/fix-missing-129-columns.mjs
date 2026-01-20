import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixMissingColumns() {
  console.log('🔧 Fixing Missing Migration 129 Columns\n')
  console.log('='.repeat(70))

  // The SQL statements that need to run
  const sql = `
-- STEP 1: Add HR-only visibility to employee_notes
ALTER TABLE public.employee_notes 
ADD COLUMN IF NOT EXISTS hr_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.employee_notes.hr_only IS 
'When true, note is only visible to admin/HR roles';

-- Add source tracking to candidates
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS source_person_id UUID,
ADD COLUMN IF NOT EXISTS source_enrollment_id UUID,
ADD COLUMN IF NOT EXISTS conversion_source TEXT;

-- STEP 2: Add pending_user_creation tracking to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS needs_user_account BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_created_by UUID,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';
`

  console.log('Executing SQL to add missing columns...\n')
  console.log(sql)
  console.log('\n' + '='.repeat(70))
  console.log('\n⚠️  IMPORTANT: This SQL must be run manually in Supabase SQL Editor')
  console.log('\nGo to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
  console.log('\nPaste and run the SQL above.')
}

fixMissingColumns().catch(console.error)
