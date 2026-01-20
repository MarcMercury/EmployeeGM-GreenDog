import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixPendingFlags() {
  console.log('=== Fixing needs_user_account flags ===\n')
  
  // Get all affected employee IDs
  const { data: affected, error: fetchError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, profile_id, profiles:profile_id(auth_user_id)')
    .eq('needs_user_account', true)
    .eq('employment_status', 'active')
  
  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return
  }

  const toFix = affected?.filter((e: any) => e.profiles?.auth_user_id) || []
  console.log('Found', toFix.length, 'employees with accounts that need flag fixed\n')
  
  if (toFix.length > 0) {
    const ids = toFix.map((e: any) => e.id)
    const { error: updateError, count } = await supabase
      .from('employees')
      .update({ needs_user_account: false })
      .in('id', ids)
    
    if (updateError) {
      console.error('Update error:', updateError)
    } else {
      console.log('✅ Successfully fixed', toFix.length, 'employees:')
      toFix.forEach((e: any) => console.log('  -', e.first_name, e.last_name))
    }
  } else {
    console.log('No employees need fixing.')
  }
}

fixPendingFlags().catch(console.error)
