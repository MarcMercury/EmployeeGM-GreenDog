/**
 * Employee Auth Status Check
 * ==========================
 * Checks which employees have working auth accounts
 * 
 * Usage: npx tsx scripts/check-auth-status.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('   Required: SUPABASE_URL (or NUXT_PUBLIC_SUPABASE_URL)')
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface EmployeeWithProfile {
  id: string
  first_name: string
  last_name: string
  email_work: string | null
  employment_status: string
  profile_id: string | null
  profiles: {
    id: string
    auth_user_id: string | null
    email: string
    role: string
  } | null
}

async function main() {
  console.log('\n🔍 Employee Auth Status Check')
  console.log('==============================\n')

  // Fetch all employees with their profiles
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email_work,
      employment_status,
      profile_id,
      profiles:profile_id (
        id,
        auth_user_id,
        email,
        role
      )
    `)
    .eq('employment_status', 'active')
    .order('first_name')

  if (error) {
    console.error('❌ Failed to fetch employees:', error.message)
    process.exit(1)
  }

  // Fetch all auth users (with pagination)
  let authUsers: any[] = []
  let page = 1
  while (true) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    })
    
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message)
      process.exit(1)
    }
    
    if (!authData.users || authData.users.length === 0) break
    authUsers = [...authUsers, ...authData.users]
    if (authData.users.length < 100) break
    page++
  }
  const authUserMap = new Map(authUsers.map(u => [u.id, u]))

  // Categorize employees
  const ready: any[] = []
  const noProfile: any[] = []
  const noAuthUser: any[] = []
  const noEmail: any[] = []

  for (const emp of employees as EmployeeWithProfile[]) {
    const name = `${emp.first_name} ${emp.last_name}`
    const profile = emp.profiles

    if (!emp.email_work) {
      noEmail.push({ name, email: null })
      continue
    }

    if (!emp.profile_id || !profile) {
      noProfile.push({ name, email: emp.email_work })
      continue
    }

    if (!profile.auth_user_id) {
      noAuthUser.push({ name, email: emp.email_work, profileId: profile.id })
      continue
    }

    const authUser = authUserMap.get(profile.auth_user_id)
    if (!authUser) {
      noAuthUser.push({ name, email: emp.email_work, profileId: profile.id, authUserIdBroken: profile.auth_user_id })
      continue
    }

    ready.push({
      name,
      email: authUser.email,
      role: profile.role,
      lastSignIn: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString() : 'Never'
    })
  }

  // Print results
  console.log('✅ READY TO LOGIN (' + ready.length + ')')
  console.log('─'.repeat(80))
  if (ready.length > 0) {
    console.table(ready.map(r => ({
      Name: r.name,
      Email: r.email,
      Role: r.role,
      'Last Login': r.lastSignIn
    })))
  }

  if (noEmail.length > 0) {
    console.log('\n⚠️  NO WORK EMAIL (' + noEmail.length + ') - Cannot create account')
    console.log('─'.repeat(80))
    noEmail.forEach(e => console.log(`   • ${e.name}`))
  }

  if (noProfile.length > 0) {
    console.log('\n❌ NO PROFILE LINKED (' + noProfile.length + ')')
    console.log('─'.repeat(80))
    noProfile.forEach(e => console.log(`   • ${e.name} (${e.email})`))
  }

  if (noAuthUser.length > 0) {
    console.log('\n❌ NO AUTH USER (' + noAuthUser.length + ') - Has profile but no login')
    console.log('─'.repeat(80))
    noAuthUser.forEach(e => console.log(`   • ${e.name} (${e.email})`))
  }

  // Summary
  console.log('\n📊 SUMMARY')
  console.log('─'.repeat(40))
  console.log(`   Total Active Employees: ${employees?.length || 0}`)
  console.log(`   ✅ Ready to Login:      ${ready.length}`)
  console.log(`   ⚠️  No Work Email:       ${noEmail.length}`)
  console.log(`   ❌ No Profile:          ${noProfile.length}`)
  console.log(`   ❌ No Auth User:        ${noAuthUser.length}`)

  if (noProfile.length > 0 || noAuthUser.length > 0) {
    console.log('\n💡 TO FIX: Run `npm run seed:users` to create missing auth accounts')
  } else if (ready.length === employees?.length) {
    console.log('\n🎉 All employees are ready to login!')
  }

  console.log('')
}

main().catch(console.error)
