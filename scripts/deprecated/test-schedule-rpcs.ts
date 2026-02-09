/**
 * Schedule RPC Connectivity Test
 * 
 * Tests all schedule-related RPC functions for database connectivity
 * Run with: npx tsx scripts/test-schedule-rpcs.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  duration?: number
}

const results: TestResult[] = []

async function testFunction(name: string, fn: () => Promise<any>): Promise<void> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    
    if (result.error) {
      results.push({ name, status: 'fail', message: result.error.message, duration })
    } else {
      results.push({ name, status: 'pass', message: 'OK', duration })
    }
  } catch (err: any) {
    const duration = Date.now() - start
    results.push({ name, status: 'fail', message: err.message, duration })
  }
}

async function runTests() {
  console.log('🔬 Testing Schedule RPC Functions\n')
  console.log('='.repeat(60))

  // Test 1: Check services table connectivity
  await testFunction('services table', async () => {
    return await supabase.from('services').select('id, name, code').limit(3)
  })

  // Test 2: Check service_staffing_requirements table
  await testFunction('service_staffing_requirements table', async () => {
    return await supabase.from('service_staffing_requirements').select('id, service_id, role_label').limit(3)
  })

  // Test 3: Check locations table
  await testFunction('locations table', async () => {
    return await supabase.from('locations').select('id, name, code').limit(3)
  })

  // Test 4: Check schedule_drafts table
  await testFunction('schedule_drafts table', async () => {
    return await supabase.from('schedule_drafts').select('id, location_id, week_start, status').limit(3)
  })

  // Test 5: Check draft_slots table
  await testFunction('draft_slots table', async () => {
    return await supabase.from('draft_slots').select('id, draft_id, service_id, role_label').limit(3)
  })

  // Test 6: Check schedule_templates table
  await testFunction('schedule_templates table', async () => {
    return await supabase.from('schedule_templates').select('id, name, usage_count').limit(3)
  })

  // Test 7: get_schedule_dashboard function
  await testFunction('get_schedule_dashboard()', async () => {
    return await supabase.rpc('get_schedule_dashboard', { 
      p_week_start: '2026-01-26' 
    })
  })

  // Test 8: list_schedule_templates function
  await testFunction('list_schedule_templates()', async () => {
    return await supabase.rpc('list_schedule_templates', {})
  })

  // Test 9: Check employees table (for availability)
  await testFunction('employees table', async () => {
    return await supabase.from('employees').select('id, first_name, last_name').limit(3)
  })

  // Test 10: Check profiles table
  await testFunction('profiles table', async () => {
    return await supabase.from('profiles').select('id, first_name, last_name, role').limit(3)
  })

  // Test 11: Check page_definitions for schedule pages
  await testFunction('page_definitions (schedule)', async () => {
    return await supabase.from('page_definitions')
      .select('id, path, name, section')
      .like('path', '/schedule%')
  })

  // Test 12: Check page_access for schedule pages (combined query)
  await testFunction('page_access (schedule)', async () => {
    return await supabase.from('page_access')
      .select(`
        page_id,
        role_key,
        access_level,
        page:page_id(path, name)
      `)
      .not('page', 'is', null)
      .limit(50)
  })

  // Test 13: Check role_definitions table
  await testFunction('role_definitions table', async () => {
    return await supabase.from('role_definitions').select('role_key, display_name, tier').order('tier', { ascending: false })
  })

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results\n')
  
  let passed = 0
  let failed = 0
  let skipped = 0
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'
    const duration = result.duration ? ` (${result.duration}ms)` : ''
    console.log(`${icon} ${result.name}${duration}`)
    if (result.status === 'fail') {
      console.log(`   └─ ${result.message}`)
    }
    
    if (result.status === 'pass') passed++
    else if (result.status === 'fail') failed++
    else skipped++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
