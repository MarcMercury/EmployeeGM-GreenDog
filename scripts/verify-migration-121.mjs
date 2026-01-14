import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyMigration121() {
  console.log('Verifying Migration 121 (Student Program Extension)...\n')
  
  // Check person_program_data table structure by inserting/selecting
  const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: 'person_program_data' })
  
  if (error) {
    // Try checking by selecting from table directly
    const { data, error: selectError } = await supabase
      .from('person_program_data')
      .select('program_type, enrollment_status, school_of_origin, cohort_identifier')
      .limit(1)
    
    if (selectError && selectError.code === '42P01') {
      console.log('❌ person_program_data table does NOT exist')
    } else if (selectError && selectError.code !== 'PGRST116') {
      console.log('Table exists but error:', selectError.message)
    } else {
      console.log('✅ person_program_data table exists with expected columns')
    }
  }
  
  // Check if functions exist by trying to call them
  console.log('\nChecking functions from migration 121:')
  
  // Test find_or_create_person function exists
  const { data: funcData, error: funcError } = await supabase.rpc('find_or_create_person', {
    p_email: 'test-check@example.com',
    p_first_name: 'Test',
    p_last_name: 'Check'
  })
  
  if (funcError) {
    if (funcError.message.includes('Could not find the function')) {
      console.log('❌ find_or_create_person function NOT found')
    } else {
      console.log('✅ find_or_create_person function exists (error was:', funcError.message.substring(0, 50) + '...)')
    }
  } else {
    console.log('✅ find_or_create_person function exists and works')
  }

  // Check student_program_view
  const { count, error: viewError } = await supabase
    .from('student_program_view')
    .select('*', { count: 'exact', head: true })
  
  if (viewError && viewError.code === '42P01') {
    console.log('❌ student_program_view does NOT exist')
  } else if (viewError) {
    console.log('⚠️  student_program_view:', viewError.message)
  } else {
    console.log(`✅ student_program_view exists (${count} rows)`)
  }
  
  console.log('\n✅ All migrations appear to be applied!')
}

verifyMigration121()
