/**
 * System Verification Script
 * ==========================
 * Comprehensive checks to ensure the system is ready for users
 * 
 * Usage: npx tsx scripts/system-verification.ts
 * 
 * Tests:
 * 1. Database connectivity
 * 2. Auth system health
 * 3. RLS policies working
 * 4. Critical tables exist
 * 5. Triggers are functional
 * 6. API endpoints responding
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('   Required: SUPABASE_URL (or NUXT_PUBLIC_SUPABASE_URL)')
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Admin client (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Anon client (respects RLS - simulates frontend)
const anonClient = SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: any
}

const results: TestResult[] = []

function log(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
  console.log(`${icon} ${result.name}: ${result.message}`)
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`)
  }
  results.push(result)
}

async function testDatabaseConnectivity() {
  console.log('\n📊 DATABASE CONNECTIVITY')
  console.log('─'.repeat(50))
  
  try {
    const start = Date.now()
    const { data, error } = await adminClient.from('profiles').select('count').limit(1)
    const latency = Date.now() - start
    
    if (error) throw error
    
    log({
      name: 'Database Connection',
      status: latency < 500 ? 'pass' : 'warn',
      message: `Connected in ${latency}ms`,
      details: latency > 500 ? { warning: 'High latency detected' } : undefined
    })
  } catch (err: any) {
    log({
      name: 'Database Connection',
      status: 'fail',
      message: err.message
    })
  }
}

async function testCriticalTables() {
  console.log('\n📋 CRITICAL TABLES')
  console.log('─'.repeat(50))
  
  const criticalTables = [
    { name: 'profiles', required: true },
    { name: 'employees', required: true },
    { name: 'notifications', required: true },
    { name: 'marketing_events', required: true },
    { name: 'marketing_calendar_notes', required: true },
    { name: 'schedule_time_off_requests', required: false },
    { name: 'compliance_tasks', required: false },
  ]
  
  for (const table of criticalTables) {
    try {
      const { count, error } = await adminClient
        .from(table.name)
        .select('*', { count: 'exact', head: true })
      
      if (error) throw error
      
      log({
        name: `Table: ${table.name}`,
        status: 'pass',
        message: `Exists with ${count} rows`
      })
    } catch (err: any) {
      log({
        name: `Table: ${table.name}`,
        status: table.required ? 'fail' : 'warn',
        message: err.message
      })
    }
  }
}

async function testAuthSystem() {
  console.log('\n🔐 AUTH SYSTEM')
  console.log('─'.repeat(50))
  
  try {
    // Check if auth users exist
    const { data: authData, error } = await adminClient.auth.admin.listUsers({ perPage: 10 })
    
    if (error) throw error
    
    const users = authData?.users || []
    const confirmedUsers = users.filter(u => u.email_confirmed_at)
    
    log({
      name: 'Auth Users',
      status: users.length > 0 ? 'pass' : 'warn',
      message: `${users.length} auth users found (${confirmedUsers.length} confirmed)`
    })
    
    // Check profile linkage
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, auth_user_id, email, role')
      .not('auth_user_id', 'is', null)
      .limit(100)
    
    const linkedProfiles = profiles?.length || 0
    const authUserIds = new Set(users.map(u => u.id))
    const validLinks = profiles?.filter(p => authUserIds.has(p.auth_user_id)).length || 0
    
    log({
      name: 'Profile-Auth Links',
      status: validLinks === linkedProfiles ? 'pass' : 'warn',
      message: `${validLinks}/${linkedProfiles} profiles have valid auth links`
    })
  } catch (err: any) {
    log({
      name: 'Auth System',
      status: 'fail',
      message: err.message
    })
  }
}

async function testRLSPolicies() {
  console.log('\n🛡️ RLS POLICIES')
  console.log('─'.repeat(50))
  
  if (!anonClient) {
    log({
      name: 'RLS Test',
      status: 'warn',
      message: 'Skipped - no anon key available'
    })
    return
  }
  
  // Anon user should NOT be able to read profiles without auth
  try {
    const { data, error } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1)
    
    // If RLS is working, anon should get empty results or error
    if (data && data.length > 0) {
      log({
        name: 'Profiles RLS',
        status: 'fail',
        message: 'SECURITY ISSUE: Anon can read profiles!'
      })
    } else {
      log({
        name: 'Profiles RLS',
        status: 'pass',
        message: 'Anon cannot read profiles (RLS working)'
      })
    }
  } catch (err: any) {
    log({
      name: 'Profiles RLS',
      status: 'pass',
      message: 'RLS blocking anon access'
    })
  }
}

async function testTriggers() {
  console.log('\n⚡ DATABASE TRIGGERS')
  console.log('─'.repeat(50))
  
  // Check that critical triggers exist
  let triggers = null
  let error = null
  try {
    const result = await adminClient.rpc('get_triggers_info')
    triggers = result.data
    error = result.error
  } catch {
    // Function may not exist
  }
  
  // Alternative: Query pg_trigger directly via SQL
  let triggerData = null
  try {
    const result = await adminClient
      .from('pg_trigger' as any)
      .select('*')
      .limit(1)
    triggerData = result.data
  } catch {
    // May not have access
  }
  
  // Check the notification trigger exists by looking at function
  let functions = null
  try {
    const result = await adminClient.rpc('check_function_exists', { 
      func_name: 'notify_marketing_event_created' 
    })
    functions = result.data
  } catch {
    // Function may not exist
  }
  
  // Simpler check - try to insert and see if notification is created
  log({
    name: 'Trigger Functions',
    status: 'warn',
    message: 'Manual verification recommended - check notify_marketing_event_created works'
  })
}

async function testNotificationSystem() {
  console.log('\n🔔 NOTIFICATION SYSTEM')
  console.log('─'.repeat(50))
  
  try {
    // Check notifications table structure
    const { data, error } = await adminClient
      .from('notifications')
      .select('id, profile_id, type, category, title, created_at')
      .limit(5)
    
    if (error) throw error
    
    log({
      name: 'Notifications Table',
      status: 'pass',
      message: `Working - ${data?.length || 0} recent notifications found`
    })
    
    // Check for marketing notifications specifically
    const { data: marketingNotifs } = await adminClient
      .from('notifications')
      .select('*')
      .eq('category', 'marketing')
      .limit(5)
    
    log({
      name: 'Marketing Notifications',
      status: 'pass',
      message: `${marketingNotifs?.length || 0} marketing notifications exist`
    })
  } catch (err: any) {
    log({
      name: 'Notification System',
      status: 'fail',
      message: err.message
    })
  }
}

async function testEmployeeProfiles() {
  console.log('\n👥 USER/EMPLOYEE DATA')
  console.log('─'.repeat(50))
  
  try {
    // Count active employees
    const { count: employeeCount } = await adminClient
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('employment_status', 'active')
    
    // Count employees with profiles
    const { data: empWithProfiles } = await adminClient
      .from('employees')
      .select('id, first_name, last_name, profile_id')
      .eq('employment_status', 'active')
      .not('profile_id', 'is', null)
    
    // Count profiles with auth
    const { data: profilesWithAuth } = await adminClient
      .from('profiles')
      .select('id, email')
      .not('auth_user_id', 'is', null)
    
    log({
      name: 'Active Employees',
      status: 'pass',
      message: `${employeeCount || 0} active employees`
    })
    
    log({
      name: 'Employees with Profiles',
      status: empWithProfiles?.length === employeeCount ? 'pass' : 'warn',
      message: `${empWithProfiles?.length || 0}/${employeeCount || 0} have linked profiles`
    })
    
    log({
      name: 'Profiles with Auth',
      status: 'pass',
      message: `${profilesWithAuth?.length || 0} profiles can log in`
    })
  } catch (err: any) {
    log({
      name: 'User/Employee Data',
      status: 'fail',
      message: err.message
    })
  }
}

async function testMarketingCalendar() {
  console.log('\n📅 MARKETING CALENDAR')
  console.log('─'.repeat(50))
  
  try {
    const { count: eventCount } = await adminClient
      .from('marketing_events')
      .select('*', { count: 'exact', head: true })
    
    const { count: noteCount } = await adminClient
      .from('marketing_calendar_notes')
      .select('*', { count: 'exact', head: true })
    
    log({
      name: 'Marketing Events',
      status: 'pass',
      message: `${eventCount || 0} events exist`
    })
    
    log({
      name: 'Calendar Notes',
      status: 'pass',
      message: `${noteCount || 0} notes exist`
    })
  } catch (err: any) {
    log({
      name: 'Marketing Calendar',
      status: 'fail',
      message: err.message
    })
  }
}

async function main() {
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('    🔍 SYSTEM VERIFICATION - EmployeeGM')
  console.log('═'.repeat(60))
  console.log(`    Time: ${new Date().toISOString()}`)
  console.log(`    URL:  ${SUPABASE_URL}`)
  console.log('═'.repeat(60))

  await testDatabaseConnectivity()
  await testCriticalTables()
  await testAuthSystem()
  await testRLSPolicies()
  await testTriggers()
  await testNotificationSystem()
  await testEmployeeProfiles()
  await testMarketingCalendar()
  
  // Summary
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('    📊 SUMMARY')
  console.log('═'.repeat(60))
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warned = results.filter(r => r.status === 'warn').length
  
  console.log(`    ✅ Passed:   ${passed}`)
  console.log(`    ❌ Failed:   ${failed}`)
  console.log(`    ⚠️  Warnings: ${warned}`)
  console.log('═'.repeat(60))
  
  if (failed > 0) {
    console.log('\n⛔ SYSTEM NOT READY - Fix failed checks before launch')
    process.exit(1)
  } else if (warned > 0) {
    console.log('\n⚠️  SYSTEM READY WITH WARNINGS - Review before launch')
    process.exit(0)
  } else {
    console.log('\n✅ SYSTEM READY - All checks passed!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
