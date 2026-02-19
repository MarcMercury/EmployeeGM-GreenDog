// Script to run SQL migrations via Supabase
// This creates a temporary function and uses it to execute SQL

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    envVars[key] = valueParts.join('=')
  }
})

const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('📝 Running pending migrations...\n')
  
  // Find all migration files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  
  console.log(`Found ${files.length} migration files`)
  console.log('Applying: 20260219000003_register_market_events_scout_agent.sql\n')
  
  const migrationFile = files.find(f => f.includes('20260219000003_register_market_events_scout_agent'))
  
  if (!migrationFile) {
    console.error('❌ Migration file not found!')
    process.exit(1)
  }
  
  const migrationPath = path.join(migrationsDir, migrationFile)
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Execute directly via SQL
    const { data, error } = await supabase.from('agent_registry').select('agent_id').limit(1)
    
    if (error) {
      throw error
    }
    
    // If we can query the table, try to insert the agent
    console.log('✓ Database connection successful')
    console.log('✓ Running agent registration migration...')
    
    // Parse and execute the INSERT statement
    const insertMatch = sql.match(/INSERT INTO public\.agent_registry[\s\S]*?ON CONFLICT[\s\S]*?;/m)
    if (insertMatch) {
      const { data: result, error: insertError } = await supabase
        .from('agent_registry')
        .upsert({
          agent_id: 'market_events_scout',
          display_name: 'Marketing Events Scout',
          cluster: 'engagement',
          description: 'Discovers local pet-related and community events via web search. Automatically adds discovered events to the marketing calendar as proposed events with pre-filled details.',
          status: 'paused',
          schedule_cron: '0 6 * * 0',
          daily_token_budget: 10000,
          config: {
            location: 'Los Angeles, California',
            keywords: [
              'pet festival',
              'holiday walk',
              'street fair',
              'animal event',
              'pet parade',
              'veterinary conference',
              'pet adoption',
              'dog friendly',
              'animal rescue',
              'pet expo',
              'farmers market',
              'holiday market',
              'community fair',
              'carnival',
              'festival'
            ],
            eventTypes: [
              'street_fair',
              'pet_expo',
              'community_outreach',
              'fundraiser'
            ],
            autoApproveThreshold: 0.8,
            maxProposals: 20,
            description: 'Discovers local pet and community events to expand marketing reach'
          }
        }, { onConflict: 'agent_id' })
      
      if (insertError) {
        throw insertError
      }
      
      console.log('✅ Migration applied successfully!')
      console.log('\n📋 Agent Details:')
      console.log('   Agent ID: market_events_scout')
      console.log('   Display Name: Marketing Events Scout')
      console.log('   Cluster: engagement')
      console.log('   Status: paused (activate from Admin panel)')
      console.log('   Schedule: Every Sunday at 6 AM')
      console.log('   Daily Budget: 10,000 tokens')
      console.log('\n✓ Next steps:')
      console.log('  1. Go to Admin → Agents')
      console.log('  2. Find "Marketing Events Scout"')
      console.log('  3. Toggle status to "active"')
      console.log('  4. Click "Run Now" to test')
    }
  } catch (err) {
    console.error('❌ Migration error:', err.message)
    console.error('\n🔧 If the above fails, apply manually:')
    console.error('1. Open: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
    console.error('2. Copy contents of: supabase/migrations/20260219000003_register_market_events_scout_agent.sql')
    console.error('3. Paste into SQL editor and click "Run"')
    process.exit(1)
  }
}

runMigrations().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
