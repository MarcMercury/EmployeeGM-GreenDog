/**
 * Deep Auth Investigation
 * ========================
 * Investigates the mismatch between auth.users and what listUsers returns
 * 
 * Usage: npx tsx scripts/deep-auth-check.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('\n🔬 Deep Auth Investigation')
  console.log('===========================\n')

  // Get all auth users with pagination
  let allAuthUsers: any[] = []
  let page = 1
  const perPage = 100
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })
    
    if (error) {
      console.error('Error fetching users:', error)
      break
    }
    
    if (!data.users || data.users.length === 0) break
    
    allAuthUsers = [...allAuthUsers, ...data.users]
    console.log(`   Page ${page}: fetched ${data.users.length} users (total: ${allAuthUsers.length})`)
    
    if (data.users.length < perPage) break
    page++
  }

  console.log(`\n📧 Total auth users found: ${allAuthUsers.length}\n`)

  // Create lookup
  const authByEmail = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u]))

  // Get problematic profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id')
    .eq('employment_status', 'active')

  // Check each problem employee
  const problemEmails = [
    'aislinn.dickey@greendogdental.com',
    'alysia.sanford@greendogdental.com', 
    'marc.mercury@greendogdental.com',
    'adriana.gutierrez@greendogdental.com'
  ]

  console.log('--- Checking problem emails ---')
  for (const email of problemEmails) {
    const authUser = authByEmail.get(email)
    console.log(`\n${email}:`)
    if (authUser) {
      console.log(`   ✅ Found in auth.users`)
      console.log(`   ID: ${authUser.id}`)
      console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`)
    } else {
      console.log(`   ❌ NOT in auth.users`)
    }
    
    // Check profile
    const profile = profiles?.find(p => p.email?.toLowerCase() === email)
    if (profile) {
      console.log(`   Profile ID: ${profile.id}`)
      console.log(`   Profile auth_user_id: ${profile.auth_user_id}`)
      
      // Check if this auth_user_id matches
      if (authUser && profile.auth_user_id === authUser.id) {
        console.log(`   ✅ IDs match!`)
      } else if (authUser) {
        console.log(`   ⚠️  ID MISMATCH - profile has wrong auth_user_id`)
      }
    }
  }

  // If we found all auth users, let's fix the profile links
  console.log('\n\n--- Attempting to fix profile auth_user_id links ---')
  
  let fixed = 0
  for (const emp of employees || []) {
    const email = emp.email_work?.toLowerCase()
    if (!email) continue
    
    const authUser = authByEmail.get(email)
    if (!authUser) continue
    
    const profile = profiles?.find(p => p.id === emp.profile_id)
    if (!profile) continue
    
    // Check if we need to fix
    if (profile.auth_user_id !== authUser.id) {
      console.log(`\n🔧 Fixing: ${emp.first_name} ${emp.last_name}`)
      console.log(`   Old auth_user_id: ${profile.auth_user_id}`)
      console.log(`   New auth_user_id: ${authUser.id}`)
      
      // Clear the old value first to avoid unique constraint
      const { error: clearError } = await supabase
        .from('profiles')
        .update({ auth_user_id: null })
        .eq('id', profile.id)
      
      if (clearError) {
        console.log(`   ❌ Clear error: ${clearError.message}`)
        continue
      }

      const { error } = await supabase
        .from('profiles')
        .update({ auth_user_id: authUser.id })
        .eq('id', profile.id)
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else {
        console.log(`   ✅ Fixed!`)
        fixed++
      }
    }
  }

  console.log(`\n===========================`)
  console.log(`✅ Fixed ${fixed} profile links`)
  console.log(`===========================\n`)
}

main().catch(console.error)
