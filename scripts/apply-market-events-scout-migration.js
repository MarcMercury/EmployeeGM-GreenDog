import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env file
const envContent = fs.readFileSync('.env', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    envVars[key] = valueParts.join('=')
  }
})

const supabaseUrl = envVars.SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found')
  process.exit(1)
}

console.log('📝 Applying Market Events Scout Agent migration...')
console.log(`🔗 Using Supabase: ${supabaseUrl?.substring(0, 50)}...`)

const supabase = createClient(supabaseUrl, supabaseKey)

const migrationSql = fs.readFileSync('supabase/migrations/20260219000003_register_market_events_scout_agent.sql', 'utf8')

try {
  const result = await supabase.rpc('exec_sql', { sql: migrationSql })
  
  if (result.error) {
    console.error('❌ Migration failed:', result.error)
    process.exit(1)
  }
  
  console.log('✅ Migration applied successfully!')
  console.log('✓ Agent registered: market_events_scout')
  console.log('')
  console.log('Next steps:')
  console.log('1. Go to Admin → Agents page')
  console.log('2. Find "Marketing Events Scout" in the Agent Roster')
  console.log('3. Toggle status from "paused" to "active"')
  console.log('4. Click "Run Now" to test')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
}
