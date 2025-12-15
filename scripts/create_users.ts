/**
 * Batch User Creation Script
 * ===========================
 * This script creates auth users for all employees in the database.
 * It uses the Supabase Admin API (service role key) to:
 * 1. Fetch all employees from the database
 * 2. Create auth users for each employee
 * 3. Link the auth user to their profile record
 * 
 * Usage: npm run seed:users
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('   Required: SUPABASE_URL (or NUXT_PUBLIC_SUPABASE_URL)')
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase Admin Client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Default password for all new users
const DEFAULT_PASSWORD = 'GreenDog2025!'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email_work: string | null
  profile_id: string | null
}

interface Profile {
  id: string
  auth_user_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  role: string
}

async function main() {
  console.log('\n🐕 Green Dog Employee User Creation Script')
  console.log('==========================================\n')

  // Step A: Fetch all employees
  console.log('📋 Step 1: Fetching employees from database...')
  
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id')
    .eq('employment_status', 'active')
    .order('first_name')

  if (fetchError) {
    console.error('❌ Failed to fetch employees:', fetchError.message)
    process.exit(1)
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️  No active employees found in database.')
    process.exit(0)
  }

  console.log(`   Found ${employees.length} active employees\n`)

  // Stats tracking
  let created = 0
  let skipped = 0
  let errors = 0
  let noEmail = 0

  // Step B: Loop through each employee
  console.log('👤 Step 2: Creating auth users...\n')

  for (const employee of employees as Employee[]) {
    const email = employee.email_work?.toLowerCase().trim()
    const fullName = `${employee.first_name} ${employee.last_name}`

    // Skip if no work email
    if (!email) {
      console.log(`   ⚪ SKIP: ${fullName} - No work email`)
      noEmail++
      continue
    }

    try {
      // Check if user already exists in auth.users
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email)

      if (existingUser) {
        console.log(`   ⏭️  EXISTS: ${fullName} (${email})`)
        
        // Still need to link profile if not linked
        if (employee.profile_id) {
          await linkProfileToAuth(employee.profile_id, existingUser.id, email, employee)
        }
        skipped++
        continue
      }

      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: DEFAULT_PASSWORD,
        email_confirm: true, // Auto-verify so they can log in immediately
        user_metadata: {
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: 'user'
        }
      })

      if (createError) {
        console.error(`   ❌ ERROR: ${fullName} - ${createError.message}`)
        errors++
        continue
      }

      if (newUser?.user) {
        console.log(`   ✅ CREATED: ${fullName} (${email})`)
        created++

        // Step C: Link profile to auth user
        await linkProfileToAuth(employee.profile_id, newUser.user.id, email, employee)
      }

    } catch (err: any) {
      console.error(`   ❌ ERROR: ${fullName} - ${err.message}`)
      errors++
    }
  }

  // Summary
  console.log('\n==========================================')
  console.log('📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`)
  console.log(`   ⚪ Skipped (no email): ${noEmail}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log('==========================================')
  console.log(`\n🔑 Default password for all users: ${DEFAULT_PASSWORD}`)
  console.log('   Users should change this on first login!\n')
}

async function linkProfileToAuth(
  profileId: string | null, 
  authUserId: string, 
  email: string,
  employee: Employee
) {
  try {
    if (profileId) {
      // Update existing profile with auth_user_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profileId)
        .is('auth_user_id', null) // Only update if not already linked

      if (updateError && !updateError.message.includes('0 rows')) {
        console.log(`      ⚠️  Profile link warning: ${updateError.message}`)
      }
    } else {
      // Create new profile and link to employee
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          email: email,
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: 'user',
          is_active: true
        })
        .select('id')
        .single()

      if (profileError) {
        // Profile might already exist with this email, try to find and update it
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (existingProfile) {
          await supabase
            .from('profiles')
            .update({ auth_user_id: authUserId })
            .eq('id', existingProfile.id)

          // Link employee to profile
          await supabase
            .from('employees')
            .update({ profile_id: existingProfile.id })
            .eq('id', employee.id)
        }
      } else if (newProfile) {
        // Link employee to new profile
        await supabase
          .from('employees')
          .update({ profile_id: newProfile.id })
          .eq('id', employee.id)
      }
    }
  } catch (err: any) {
    console.log(`      ⚠️  Profile linking error: ${err.message}`)
  }
}

// Run the script
main().catch(console.error)
