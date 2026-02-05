/**
 * Debug script to diagnose sync-login issues
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  // Get Marc's auth user
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers()
  
  if (authErr) {
    console.error('Error fetching auth users:', authErr)
    return
  }
  
  const marc = users.find(u => u.email?.toLowerCase().includes('marc'))
  
  if (!marc) {
    console.log('No auth user found with marc in email')
    return
  }
  
  console.log('=== AUTH USER ===')
  console.log('ID:', marc.id)
  console.log('Email:', marc.email)
  console.log('Last sign in:', marc.last_sign_in_at)
  
  // Get profiles matching this email or auth_user_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, last_login_at, role, first_name, last_name')
    .or(`email.ilike.%marc%,auth_user_id.eq.${marc.id}`)
  
  console.log('\n=== PROFILES MATCHING MARC ===')
  for (const p of profiles || []) {
    console.log('Profile ID:', p.id)
    console.log('auth_user_id:', p.auth_user_id)
    console.log('email:', p.email)
    console.log('last_login_at:', p.last_login_at)
    console.log('Role:', p.role)
    console.log('Match auth_user_id?', p.auth_user_id === marc.id)
    console.log('---')
  }
  
  // Check if profile.id === auth.id (alternative linking that happens with create-admin-user.ts)
  const { data: idMatch, error: idErr } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, last_login_at')
    .eq('id', marc.id)
    .single()
    
  if (idMatch) {
    console.log('\n=== PROFILE WHERE ID = AUTH ID ===')
    console.log('Found profile with ID equal to auth user ID')
    console.log('Profile:', idMatch)
  } else if (idErr?.code === 'PGRST116') {
    console.log('\n=== NO PROFILE WHERE ID = AUTH ID ===')
  }
  
  // Test the actual update that sync-login does
  console.log('\n=== TESTING UPDATE ===')
  const { data: updateResult, error: updateError } = await supabase
    .from('profiles')
    .update({ last_login_at: marc.last_sign_in_at })
    .eq('auth_user_id', marc.id)
    .select('id, email, last_login_at')
  
  console.log('Update by auth_user_id result:')
  console.log('  Rows matched:', updateResult?.length || 0)
  console.log('  Error:', updateError?.message || 'none')
  console.log('  Data:', updateResult)
}

main().catch(console.error)
