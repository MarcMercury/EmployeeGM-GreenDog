/**
 * Fix Duplicate Profiles
 * =======================
 * Finds employees linked to orphan profiles when a valid profile exists
 * 
 * Usage: npx tsx scripts/fix-duplicate-profiles.ts
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
  console.log('\n🔧 Fix Duplicate Profiles')
  console.log('==========================\n')

  // Get all auth users with pagination
  let allAuthUsers: any[] = []
  let page = 1
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (!data?.users?.length) break
    allAuthUsers = [...allAuthUsers, ...data.users]
    if (data.users.length < 100) break
    page++
  }

  const authById = new Map(allAuthUsers.map(u => [u.id, u]))
  const authByEmail = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u]))

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  
  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id')
    .eq('employment_status', 'active')

  console.log(`📊 Found ${allAuthUsers.length} auth users, ${profiles?.length} profiles, ${employees?.length} employees\n`)

  // Find employees with problematic profiles
  let fixed = 0
  let orphansDeleted = 0

  for (const emp of employees || []) {
    const email = emp.email_work?.toLowerCase()
    if (!email) continue

    const currentProfile = profiles?.find(p => p.id === emp.profile_id)
    if (!currentProfile) continue

    const authUser = authByEmail.get(email)
    if (!authUser) continue

    // Check if current profile has valid auth link
    if (currentProfile.auth_user_id && authById.has(currentProfile.auth_user_id)) {
      continue // Already valid
    }

    // Current profile has invalid/stale auth_user_id
    // Is there another profile with valid auth for this email?
    const validProfile = profiles?.find(p => 
      p.email?.toLowerCase() === email && 
      p.auth_user_id === authUser.id
    )

    if (validProfile && validProfile.id !== currentProfile.id) {
      // Found a valid profile - update employee to point to it
      console.log(`🔧 ${emp.first_name} ${emp.last_name}:`)
      console.log(`   Employee points to profile: ${currentProfile.id}`)
      console.log(`   But valid profile exists:   ${validProfile.id}`)
      
      // Update employee to point to valid profile
      const { error } = await supabase
        .from('employees')
        .update({ profile_id: validProfile.id })
        .eq('id', emp.id)

      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else {
        console.log(`   ✅ Updated employee -> profile link`)
        fixed++
        
        // Now delete the orphan profile
        const { error: delError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', currentProfile.id)
        
        if (delError) {
          console.log(`   ⚠️  Could not delete orphan: ${delError.message}`)
        } else {
          console.log(`   🗑️  Deleted orphan profile`)
          orphansDeleted++
        }
      }
    }
  }

  console.log(`\n==========================`)
  console.log(`✅ Fixed: ${fixed}`)
  console.log(`🗑️  Orphans deleted: ${orphansDeleted}`)
  console.log(`==========================\n`)

  // Run final check
  console.log('--- Final Status Check ---\n')
  
  // Re-fetch to verify
  const { data: empCheck } = await supabase
    .from('employees')
    .select(`
      id, first_name, last_name, email_work,
      profiles:profile_id ( id, auth_user_id, email )
    `)
    .eq('employment_status', 'active')

  let readyCount = 0
  let brokenCount = 0

  for (const emp of empCheck || []) {
    const profile = (emp as any).profiles
    if (!profile) {
      brokenCount++
      continue
    }
    
    if (profile.auth_user_id && authById.has(profile.auth_user_id)) {
      readyCount++
    } else {
      brokenCount++
      console.log(`❌ ${emp.first_name} ${emp.last_name}: Still broken`)
    }
  }

  console.log(`\n✅ Ready to login: ${readyCount}`)
  console.log(`❌ Still broken: ${brokenCount}`)
}

main().catch(console.error)
