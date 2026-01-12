/**
 * Script to run the backfill_unified_persons() function
 * This migrates existing data from candidates, employees, education_visitors, and marketing_leads
 * into the unified_persons table
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runBackfill() {
  console.log('🔄 Running backfill_unified_persons()...')
  console.log(`   Supabase URL: ${supabaseUrl}`)
  
  // First, check current count
  const { count: beforeCount } = await supabase
    .from('unified_persons')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Current unified_persons count: ${beforeCount || 0}`)
  
  const { data, error } = await supabase.rpc('backfill_unified_persons')
  
  if (error) {
    console.error('❌ Backfill failed:', error.message)
    console.error('   Details:', error)
    process.exit(1)
  }
  
  console.log('✅ Backfill completed successfully!')
  console.log('📊 Results:')
  if (Array.isArray(data)) {
    data.forEach((row: any) => {
      console.log(`   ${row.source_table}: ${row.records_created} created, ${row.duplicates_skipped} skipped (${row.records_processed} total)`)
    })
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
  
  // Show counts
  const { data: counts } = await supabase
    .from('unified_persons')
    .select('current_stage', { count: 'exact', head: false })
  
  if (counts) {
    const stageCounts = counts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.current_stage] = (acc[row.current_stage] || 0) + 1
      return acc
    }, {})
    console.log('\n📈 Unified Persons by Stage:')
    Object.entries(stageCounts).forEach(([stage, count]) => {
      console.log(`   ${stage}: ${count}`)
    })
  }
}

runBackfill().catch(console.error)
