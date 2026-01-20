/**
 * Repair Auth Users
 * ==================
 * Creates new auth users for employees whose auth_user_id points to deleted users
 * 
 * Usage: npx tsx scripts/repair-auth-users.ts
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

const DEFAULT_PASSWORD = 'GreenDog2025!'

async function main() {
  console.log('\n🔧 Repair Auth Users')
  console.log('=====================\n')

  // 1. Get all auth users
  const { data: authData } = await supabase.auth.admin.listUsers()
  const authUsers = authData?.users || []
  const authById = new Map(authUsers.map(u => [u.id, u]))
  const authByEmail = new Map(authUsers.map(u => [u.email?.toLowerCase(), u]))

  // 2. Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  
  // 3. Get all active employees with profiles
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id')
    .eq('employment_status', 'active')

  let repaired = 0
  let skipped = 0
  let errors = 0

  for (const emp of employees || []) {
    const profile = profiles?.find(p => p.id === emp.profile_id)
    if (!profile) continue

    const name = `${emp.first_name} ${emp.last_name}`
    const email = emp.email_work?.toLowerCase()

    if (!email) {
      console.log(`⚪ SKIP: ${name} - No email`)
      skipped++
      continue
    }

    // Check if auth_user_id is valid
    if (profile.auth_user_id && authById.has(profile.auth_user_id)) {
      // Already valid
      continue
    }

    // Check if there's an existing auth user with this email
    const existingAuth = authByEmail.get(email)
    
    if (existingAuth) {
      // Auth user exists, just need to update profile
      console.log(`🔗 LINKING: ${name} (${email}) to existing auth user`)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ auth_user_id: existingAuth.id })
        .eq('id', profile.id)

      if (updateError) {
        console.log(`   ❌ ERROR: ${updateError.message}`)
        errors++
      } else {
        console.log(`   ✅ Updated profile.auth_user_id`)
        repaired++
      }
    } else {
      // Need to create new auth user
      console.log(`➕ CREATING: ${name} (${email})`)
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: emp.first_name,
          last_name: emp.last_name
        }
      })

      if (createError) {
        console.log(`   ❌ ERROR: ${createError.message}`)
        errors++
        continue
      }

      // Update profile with new auth_user_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ auth_user_id: newUser.user.id })
        .eq('id', profile.id)

      if (updateError) {
        console.log(`   ❌ ERROR updating profile: ${updateError.message}`)
        errors++
      } else {
        console.log(`   ✅ Created auth user and linked to profile`)
        repaired++
      }
    }
  }

  // Handle Crystal Barrom duplicate profile
  console.log('\n--- Fixing duplicate profile for Crystal Barrom ---')
  const crystalProfiles = profiles?.filter(p => 
    p.email?.toLowerCase() === 'crystal.barrom@greendogdental.com'
  )
  
  if (crystalProfiles && crystalProfiles.length > 1) {
    // Find the one with auth_user_id and the one without
    const withAuth = crystalProfiles.find(p => p.auth_user_id)
    const withoutAuth = crystalProfiles.find(p => !p.auth_user_id)
    
    if (withAuth && withoutAuth) {
      // Find the employee that links to the orphaned profile
      const orphanedEmp = employees?.find(e => e.profile_id === withoutAuth.id)
      
      if (orphanedEmp) {
        console.log(`   Updating employee to point to correct profile`)
        const { error } = await supabase
          .from('employees')
          .update({ profile_id: withAuth.id })
          .eq('id', orphanedEmp.id)
        
        if (error) {
          console.log(`   ❌ ERROR: ${error.message}`)
        } else {
          console.log(`   ✅ Fixed Crystal Barrom's employee -> profile link`)
          
          // Delete the orphaned profile
          const { error: delError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', withoutAuth.id)
          
          if (delError) {
            console.log(`   ⚠️  Could not delete orphaned profile: ${delError.message}`)
          } else {
            console.log(`   ✅ Deleted orphaned profile`)
          }
        }
      }
    }
  }

  // Summary
  console.log('\n=====================')
  console.log('📊 Summary:')
  console.log(`   ✅ Repaired: ${repaired}`)
  console.log(`   ⚪ Skipped:  ${skipped}`)
  console.log(`   ❌ Errors:   ${errors}`)
  console.log('=====================')
  console.log(`\n🔑 Default password: ${DEFAULT_PASSWORD}`)
  console.log('   Users should change this on first login!\n')
}

main().catch(console.error)
