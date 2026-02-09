/**
 * Detailed Auth Diagnostic
 * =========================
 * Deep dive into auth/profile/employee relationships
 * 
 * Usage: npx tsx scripts/auth-diagnostic.ts
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
  console.log('\n🔬 Detailed Auth Diagnostic')
  console.log('=============================\n')

  // 1. Get all auth users
  const { data: authData } = await supabase.auth.admin.listUsers()
  const authUsers = authData?.users || []
  const authByEmail = new Map(authUsers.map(u => [u.email?.toLowerCase(), u]))
  const authById = new Map(authUsers.map(u => [u.id, u]))

  // 2. Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
  
  // 3. Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id, employment_status')
    .eq('employment_status', 'active')

  console.log(`📊 Counts:`)
  console.log(`   Auth Users: ${authUsers.length}`)
  console.log(`   Profiles:   ${profiles?.length || 0}`)
  console.log(`   Employees:  ${employees?.length || 0}\n`)

  // Find issues
  console.log('🔍 Checking for issues...\n')

  // Issue 1: Employees whose profile's auth_user_id doesn't match an actual auth user
  console.log('--- EMPLOYEES WITH BROKEN AUTH LINKS ---')
  let brokenLinks = 0
  
  for (const emp of employees || []) {
    const profile = profiles?.find(p => p.id === emp.profile_id)
    if (!profile) {
      console.log(`❌ ${emp.first_name} ${emp.last_name}: No profile linked`)
      brokenLinks++
      continue
    }
    
    if (!profile.auth_user_id) {
      console.log(`❌ ${emp.first_name} ${emp.last_name}: Profile has no auth_user_id`)
      brokenLinks++
      continue
    }
    
    const authUser = authById.get(profile.auth_user_id)
    if (!authUser) {
      console.log(`❌ ${emp.first_name} ${emp.last_name}: auth_user_id ${profile.auth_user_id} doesn't exist in auth.users`)
      brokenLinks++
    }
  }
  
  if (brokenLinks === 0) {
    console.log('✅ No broken links found')
  }

  // Issue 2: Auth users without corresponding profiles
  console.log('\n--- AUTH USERS WITHOUT PROFILES ---')
  let orphanedAuth = 0
  
  const profileAuthIds = new Set((profiles || []).map(p => p.auth_user_id).filter(Boolean))
  
  for (const authUser of authUsers) {
    if (!profileAuthIds.has(authUser.id)) {
      console.log(`⚠️  ${authUser.email} (ID: ${authUser.id})`)
      orphanedAuth++
    }
  }
  
  if (orphanedAuth === 0) {
    console.log('✅ All auth users have profiles')
  }

  // Issue 3: Duplicate profiles for same email
  console.log('\n--- DUPLICATE PROFILES (same email) ---')
  const emailCounts = new Map<string, any[]>()
  
  for (const profile of profiles || []) {
    const email = profile.email?.toLowerCase()
    if (email) {
      const existing = emailCounts.get(email) || []
      existing.push(profile)
      emailCounts.set(email, existing)
    }
  }
  
  let dupes = 0
  for (const [email, profs] of emailCounts) {
    if (profs.length > 1) {
      console.log(`⚠️  ${email}: ${profs.length} profiles`)
      for (const p of profs) {
        console.log(`      ID: ${p.id}, auth_user_id: ${p.auth_user_id || 'NULL'}`)
      }
      dupes++
    }
  }
  
  if (dupes === 0) {
    console.log('✅ No duplicate profiles')
  }

  // Summary
  console.log('\n=============================')
  console.log('📊 Issue Summary:')
  console.log(`   Broken Auth Links: ${brokenLinks}`)
  console.log(`   Orphaned Auth Users: ${orphanedAuth}`)
  console.log(`   Duplicate Profiles: ${dupes}`)
  console.log('=============================\n')
}

main().catch(console.error)
