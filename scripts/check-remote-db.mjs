import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDB() {
  console.log('Checking remote database tables...\n')
  
  // Check some key tables to verify db is accessible
  const tables = ['employees', 'profiles', 'candidates', 'candidate_interviews', 'person_program_data', 'unified_persons', 'student_program_view']
  for (const table of tables) {
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log(`  ❌ ${table}: ${countError.message}`)
    } else {
      console.log(`  ✅ ${table}: ${count} rows`)
    }
  }
}

checkDB()
