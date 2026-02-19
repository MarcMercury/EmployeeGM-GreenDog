/**
 * Test the get_invoice_dashboard RPC function
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
  console.log('=== Testing get_invoice_dashboard ===\n')

  // Test 1: All time, no filters
  console.log('--- All Time ---')
  const { data: allTime, error: allErr } = await supabase.rpc('get_invoice_dashboard', {})
  if (allErr) { console.error('ERROR:', allErr); return }
  console.log('Stats:', JSON.stringify(allTime.stats, null, 2))
  console.log('Monthly periods:', allTime.monthly?.length)
  console.log('Departments:', JSON.stringify(allTime.departments, null, 2))
  console.log('Staff (top 5):', JSON.stringify(allTime.staff?.slice(0, 5), null, 2))

  // Test 2: Last 90 days
  console.log('\n--- Last 90 Days ---')
  const start90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const end = new Date().toISOString().split('T')[0]
  const { data: last90, error: err90 } = await supabase.rpc('get_invoice_dashboard', {
    p_start_date: start90,
    p_end_date: end,
  })
  if (err90) { console.error('ERROR:', err90); return }
  console.log('Stats:', JSON.stringify(last90.stats, null, 2))
  console.log('Monthly:', JSON.stringify(last90.monthly, null, 2))

  // Test 3: Last 30 days
  console.log('\n--- Last 30 Days ---')
  const start30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const { data: last30, error: err30 } = await supabase.rpc('get_invoice_dashboard', {
    p_start_date: start30,
    p_end_date: end,
  })
  if (err30) { console.error('ERROR:', err30); return }
  console.log('Stats:', JSON.stringify(last30.stats, null, 2))
  console.log('Monthly:', JSON.stringify(last30.monthly, null, 2))

  // Test 4: Location filter
  console.log('\n--- Sherman Oaks Only ---')
  const { data: so, error: errSO } = await supabase.rpc('get_invoice_dashboard', {
    p_location: 'Green Dog - Sherman Oaks',
  })
  if (errSO) { console.error('ERROR:', errSO); return }
  console.log('Stats:', JSON.stringify(so.stats, null, 2))

  // Test 5: Compare with raw count
  console.log('\n--- Raw DB count for validation ---')
  const { count: rawTotal } = await supabase.from('invoice_lines').select('*', { count: 'exact', head: true })
  console.log('Total rows (all types):', rawTotal)
  const { count: headerCount } = await supabase.from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_type', 'Header')
  console.log('Header rows:', headerCount)
  console.log('Expected non-header rows:', (rawTotal || 0) - (headerCount || 0))
}

test().catch(e => console.error(e))
