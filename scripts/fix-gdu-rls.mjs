/**
 * Apply Migration 128 - Fix GDU RLS Policies
 * 
 * This fixes the issue where marketing_admin users can't save notes
 * for students in the person_program_data table.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function applyMigration() {
  console.log('🔧 Applying Migration 128: Fix GDU RLS Policies\n')
  console.log('='.repeat(60))

  try {
    // Step 1: Drop existing policies
    console.log('\n1️⃣  Dropping existing policies...')
    
    // We can't drop policies via the JS client, but we can try RPC
    // Instead, we'll test by inserting/updating and checking errors
    
    // Step 2: Check current state by testing an update
    console.log('\n2️⃣  Testing current person_program_data access...')
    
    // Get a sample record ID using service role
    const { data: sampleData, error: fetchError } = await supabase
      .from('person_program_data')
      .select('id, program_notes')
      .limit(1)
      .single()
    
    if (fetchError) {
      console.log('   ⚠️  No records found or error:', fetchError.message)
    } else if (sampleData) {
      console.log(`   ✅ Found test record: ${sampleData.id}`)
      
      // Test update with service role (should work)
      const testNote = `Test note at ${new Date().toISOString()}`
      const { error: updateError } = await supabase
        .from('person_program_data')
        .update({ program_notes: testNote })
        .eq('id', sampleData.id)
      
      if (updateError) {
        console.log('   ❌ Service role update failed:', updateError.message)
      } else {
        console.log('   ✅ Service role can update - reverting...')
        // Revert
        await supabase
          .from('person_program_data')
          .update({ program_notes: sampleData.program_notes })
          .eq('id', sampleData.id)
      }
    }

    // Step 3: Show what needs to be done
    console.log('\n' + '='.repeat(60))
    console.log('\n📋 TO FIX THIS ISSUE:')
    console.log('\nRun this SQL in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
    console.log('\n' + '-'.repeat(60))
    console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access to program data" ON public.person_program_data;
DROP POLICY IF EXISTS "GDU coordinators can manage program data" ON public.person_program_data;

-- Admin full access
CREATE POLICY "Admins have full access to program data"
  ON public.person_program_data
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- GDU/Marketing admins can manage program data
CREATE POLICY "GDU coordinators can manage program data"
  ON public.person_program_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'manager', 'gdu_coordinator', 'marketing_admin')
    )
  );

-- Grant view access
GRANT SELECT ON public.student_program_view TO authenticated;
`)
    console.log('-'.repeat(60))

  } catch (err) {
    console.error('\n❌ Error:', err.message)
  }
}

applyMigration()
