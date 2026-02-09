/**
 * Apply migration 196 - Lead Prize Tracking
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('\u274c Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/196_lead_prize_tracking.sql')
const sql = fs.readFileSync(migrationPath, 'utf-8')

// Split SQL into individual statements
const statements = sql
  .split(/;[\s]*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Found ${statements.length} SQL statements to execute`)

async function runMigration() {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    // Skip comment-only statements
    if (stmt.replace(/--.*$/gm, '').trim().length === 0) continue
    
    console.log(`\nExecuting statement ${i + 1}...`)
    console.log(stmt.substring(0, 100) + '...')
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      if (error) {
        // Try direct query for DDL
        const { error: err2 } = await supabase.from('_exec').select().limit(0)
        console.log('Note: RPC may not exist, statements might need manual execution')
      }
    } catch (e) {
      console.log('Direct execution needed')
    }
  }
  
  // Alternative: Execute each statement type separately
  console.log('\n--- Applying migration via direct table operations ---')
  
  // Check if columns exist
  const { data: cols, error: colErr } = await supabase
    .from('marketing_leads')
    .select('*')
    .limit(1)
  
  if (colErr) {
    console.error('Error checking table:', colErr.message)
  } else {
    console.log('Current columns in marketing_leads:', Object.keys(cols?.[0] || {}))
    
    // Check if prize columns are already there
    const sample = cols?.[0] || {}
    if ('prize_inventory_item_id' in sample) {
      console.log('✓ prize_inventory_item_id column already exists')
    } else {
      console.log('⚠ prize_inventory_item_id column NOT found - please run migration manually in Supabase dashboard')
    }
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration check complete')
    console.log('\nIf columns are missing, run this SQL in Supabase SQL Editor:')
    console.log('----------------------------------------')
    console.log(sql)
  })
  .catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
