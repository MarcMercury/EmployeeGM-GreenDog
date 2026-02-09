/**
 * RESOLVE ALL PENDING USERS
 * 
 * This script will:
 * 1. Get all employees with needs_user_account = true
 * 2. For each one, check if auth user exists with that email
 * 3. If auth user exists but not linked, link them
 * 4. If no auth user exists, create one
 * 5. Create/update profile record
 * 6. Set needs_user_account = false
 * 7. Clean up any duplicate profiles
 * 
 * Usage: npx tsx scripts/resolve-all-pending-users.ts
 * Dry run: npx tsx scripts/resolve-all-pending-users.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Default password for new accounts — should be changed by user on first login
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || `GDD-${crypto.randomUUID().slice(0, 8)}`

interface PendingEmployee {
  id: string
  first_name: string
  last_name: string
  email_work: string | null
  email_personal: string | null
  profile_id: string | null
  profiles: {
    id: string
    auth_user_id: string | null
    email: string | null
  } | null
}

interface ActionResult {
  employee_id: string
  name: string
  email: string
  action: string
  success: boolean
  auth_user_id?: string
  error?: string
}

async function main() {
  console.log('=' .repeat(60))
  console.log('RESOLVING ALL PENDING USERS')
  console.log('=' .repeat(60))
  if (DRY_RUN) console.log('🏜️  DRY RUN — no data will be modified')
  console.log()

  // Step 1: Get all pending employees
  console.log('Step 1: Fetching pending employees...')
  const { data: pendingEmployeesRaw, error: fetchError } = await supabase
    .from('employees')
    .select(`
      id, 
      first_name, 
      last_name, 
      email_work,
      email_personal,
      profile_id,
      profiles:profile_id(id, auth_user_id, email)
    `)
    .eq('needs_user_account', true)
    .eq('employment_status', 'active')

  if (fetchError) {
    console.error('Error fetching pending employees:', fetchError)
    process.exit(1)
  }

  // Filter out employees who already have auth_user_id on their profile
  const pendingEmployees = (pendingEmployeesRaw || [])
    .filter((e: any) => !e.profiles?.auth_user_id) as PendingEmployee[]

  console.log(`Found ${pendingEmployees.length} truly pending employees (no auth linked)\n`)

  if (!pendingEmployees || pendingEmployees.length === 0) {
    console.log('No pending employees to process!')
    return
  }

  // List them all first
  console.log('Pending employees to process:')
  console.log('-'.repeat(60))
  for (const emp of pendingEmployees) {
    const email = emp.email_work || emp.email_personal || emp.profiles?.email
    console.log(`  ${emp.first_name} ${emp.last_name} <${email}>`)
    console.log(`    Employee ID: ${emp.id}`)
    console.log(`    Profile ID: ${emp.profile_id || 'NONE'}`)
    console.log(`    Profile auth_user_id: ${emp.profiles?.auth_user_id || 'NONE'}`)
    console.log()
  }

  // Step 2: Process each pending employee
  const results: ActionResult[] = []

  for (const employee of pendingEmployees as PendingEmployee[]) {
    // Determine the email to use (prefer work email)
    const emailToUse = employee.email_work || employee.email_personal || employee.profiles?.email
    
    console.log('='.repeat(60))
    console.log(`Processing: ${employee.first_name} ${employee.last_name}`)
    console.log(`Email: ${emailToUse}`)
    console.log('='.repeat(60))

    if (!emailToUse) {
      console.log('  ❌ SKIPPED: No email available')
      results.push({
        employee_id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: 'NO EMAIL',
        action: 'skipped',
        success: false,
        error: 'No email address available'
      })
      continue
    }

    const result: ActionResult = {
      employee_id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: emailToUse,
      action: '',
      success: false
    }

    try {
      // Step 2a: Check if auth user already exists with this email
      const { data: authData } = await supabase.auth.admin.listUsers()
      const existingAuthUser = authData?.users?.find(
        u => u.email?.toLowerCase() === emailToUse.toLowerCase()
      )

      let authUserId: string

      if (existingAuthUser) {
        console.log(`  Auth user already exists: ${existingAuthUser.id}`)
        authUserId = existingAuthUser.id
        result.action = 'linked_existing_auth'
      } else {
        if (DRY_RUN) {
          console.log(`  🏜️  Would create auth user for ${emailToUse}`)
          result.action = 'would_create_new_auth'
          result.success = true
          results.push(result)
          continue
        }

        // Create new auth user
        console.log(`  Creating new auth user...`)
        const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
          email: emailToUse,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            first_name: employee.first_name,
            last_name: employee.last_name
          }
        })

        if (createError) {
          throw new Error(`Failed to create auth user: ${createError.message}`)
        }

        authUserId = newAuth.user!.id
        console.log(`  Created auth user: ${authUserId}`)
        result.action = 'created_new_auth'
      }

      result.auth_user_id = authUserId

      if (DRY_RUN) {
        console.log(`  🏜️  Would link auth ${authUserId} to profile/employee (dry run — skipped)`)
        result.action += '_dry_run'
        result.success = true
        results.push(result)
        continue
      }

      // Step 2b: Handle profile - prefer employee's existing profile
      if (employee.profile_id) {
        // Employee already has a profile - just update it with auth_user_id
        console.log(`  Updating existing profile ${employee.profile_id} with auth_user_id...`)
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            auth_user_id: authUserId,
            email: emailToUse,
            first_name: employee.first_name,
            last_name: employee.last_name,
            role: 'user',
            updated_at: new Date().toISOString()
          })
          .eq('id', employee.profile_id)
        
        if (updateProfileError) {
          console.log(`  Warning: Could not update profile: ${updateProfileError.message}`)
        }
      } else {
        // Check for existing profile by email
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id, auth_user_id, email')
          .or(`auth_user_id.eq.${authUserId},email.ilike.${emailToUse}`)

        console.log(`  Found ${existingProfiles?.length || 0} existing profile(s)`)

        if (existingProfiles && existingProfiles.length > 1) {
          // Multiple profiles - need to clean up duplicates
          console.log('  Cleaning up duplicate profiles...')
          
          // Keep the one linked to employee or the first one
          const profileToKeep = existingProfiles.find(p => p.auth_user_id === authUserId) || existingProfiles[0]
          const profilesToDelete = existingProfiles.filter(p => p.id !== profileToKeep.id)
          
          for (const dup of profilesToDelete) {
            console.log(`    Deleting duplicate profile: ${dup.id}`)
            await supabase.from('profiles').delete().eq('id', dup.id)
          }
          
          // Update the kept profile
          await supabase
            .from('profiles')
            .update({
              auth_user_id: authUserId,
              email: emailToUse,
              first_name: employee.first_name,
              last_name: employee.last_name,
              role: 'user',
              updated_at: new Date().toISOString()
            })
            .eq('id', profileToKeep.id)
            
          console.log(`    Kept and updated profile: ${profileToKeep.id}`)
        } else if (existingProfiles && existingProfiles.length === 1) {
          // One profile exists - update it
          console.log(`  Updating existing profile: ${existingProfiles[0].id}`)
          await supabase
            .from('profiles')
            .update({
              auth_user_id: authUserId,
              email: emailToUse,
              first_name: employee.first_name,
              last_name: employee.last_name,
              role: 'user',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProfiles[0].id)
        } else {
          // No profile - create one
          console.log(`  Creating new profile...`)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              auth_user_id: authUserId,
              email: emailToUse,
              first_name: employee.first_name,
              last_name: employee.last_name,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`)
          }
          console.log(`  Created new profile`)
        }
      }

      // Step 2c: Update employee record - just set needs_user_account to false
      console.log(`  Updating employee record...`)
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          needs_user_account: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id)

      if (updateError) {
        throw new Error(`Failed to update employee: ${updateError.message}`)
      }

      result.success = true
      console.log(`  ✅ SUCCESS\n`)

    } catch (error: any) {
      // Rollback: if we created a new auth user but subsequent steps failed, clean up
      if (result.action === 'created_new_auth' && result.auth_user_id) {
        console.log(`  🔄 Rolling back: deleting orphaned auth user ${result.auth_user_id}`)
        await supabase.auth.admin.deleteUser(result.auth_user_id).catch(() => {
          console.log(`  ⚠️  Rollback failed — orphaned auth user ${result.auth_user_id} may remain`)
        })
      }
      result.success = false
      result.error = error.message
      console.log(`  ❌ ERROR: ${error.message}\n`)
    }

    results.push(result)
  }

  // Summary
  console.log('\n')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\nTotal processed: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)

  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL:')
    for (const r of successful) {
      console.log(`  ${r.name} <${r.email}>`)
      console.log(`    Action: ${r.action}`)
      console.log(`    Auth User ID: ${r.auth_user_id}`)
    }
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED:')
    for (const r of failed) {
      console.log(`  ${r.name} <${r.email}>`)
      console.log(`    Error: ${r.error}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('DEFAULT PASSWORD FOR ALL NEW ACCOUNTS:')
  console.log(`  ${DEFAULT_PASSWORD}`)
  console.log('='.repeat(60))

  // Final verification
  console.log('\nVerifying no pending users remain...')
  const { data: remainingPending, error: verifyError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email')
    .eq('needs_user_account', true)
    .not('email', 'is', null)

  if (verifyError) {
    console.log('Error checking remaining:', verifyError)
  } else {
    console.log(`Remaining pending: ${remainingPending?.length || 0}`)
    if (remainingPending && remainingPending.length > 0) {
      for (const emp of remainingPending) {
        console.log(`  - ${emp.first_name} ${emp.last_name} <${emp.email}>`)
      }
    }
  }
}

main().catch(console.error)
