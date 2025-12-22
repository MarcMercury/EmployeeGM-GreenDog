/**
 * Add the missing shadow visitors to candidates table
 * These are the ones that had no email and were deleted without being added
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// The 24 original shadow visitors - checking which are NOT in candidates
const originalVisitors = [
  'Nubia Hernanadez',
  'Angelly Lopez',
  'Michelle Tercero',
  'Saul Garcia',
  'Victoria Portillo',
  'Leticia Ceja',
  'Natalie Ulloa',
  'Jessica Raymundo',
  'Jessica Basulto',
  'Ronny Moscoso',
  'Oscar Tirado',
  'Alana C. Jennings',
  'Jesse',
  'Karen Bowman',
  'Tania Martinez',
  'Aris Archilla',
  'Jeff Pepper',
  'Amalia Garcia',
  'Sonora Chavez',
  'Beatriz Argueta',
  'Ethan Young',
  'Sarah Grace Garcia',
  'Vivian Robles',
  'Trinity Green'
]

async function checkAndAddMissing() {
  // Get all existing candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('first_name, last_name')

  const existingNames = new Set(candidates?.map(c => `${c.first_name} ${c.last_name}`.toLowerCase()) || [])

  console.log('Checking which shadow visitors need to be added to candidates...\n')

  const missing = originalVisitors.filter(name => !existingNames.has(name.toLowerCase()))

  console.log(`Found ${missing.length} missing candidates:`)
  missing.forEach(name => console.log(`  - ${name}`))

  if (missing.length === 0) {
    console.log('\n✅ All shadow visitors are already in candidates table!')
    return
  }

  console.log(`\n➕ Adding ${missing.length} missing candidates...`)

  for (const name of missing) {
    const parts = name.split(' ')
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ') || ''

    const { error } = await supabase
      .from('candidates')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: `placeholder-${firstName.toLowerCase()}-${Date.now()}@noemail.local`,
        source: 'Shadow Interview',
        status: 'interview',
        notes: 'Migrated from Visitor CRM Shadow Interview program. No email on original record.'
      })

    if (error) {
      console.log(`  ❌ Failed to add ${name}: ${error.message}`)
    } else {
      console.log(`  ✅ Added: ${name}`)
    }
  }

  console.log('\n🎉 Done!')
}

checkAndAddMissing().catch(console.error)
