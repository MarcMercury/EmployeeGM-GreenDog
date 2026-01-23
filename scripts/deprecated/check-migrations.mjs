import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkMigrations() {
  console.log('🔍 Checking Migration Status (Post-120)\n')
  console.log('='.repeat(70))

  console.log('\n📋 Direct Table/Function Tests:\n')

  // Test 1: Check person_program_data
  const { data: ppd, error: ppdErr } = await supabase.from('person_program_data').select('id').limit(1)
  console.log(`${ppdErr ? '❌' : '✅'} 121 person_program_data table: ${ppdErr ? ppdErr.message : 'exists'}`)

  // Test 2: Check contact_notes table
  const { data: cn, error: cnErr } = await supabase.from('contact_notes').select('id').limit(1)
  console.log(`${cnErr ? '❌' : '✅'} 130 contact_notes table: ${cnErr ? cnErr.message : 'exists'}`)

  // Test 3: Check employee_notes has hr_only
  const { data: en, error: enErr } = await supabase.from('employee_notes').select('hr_only').limit(1)
  console.log(`${enErr ? '❌' : '✅'} 129 employee_notes.hr_only column: ${enErr ? enErr.message : 'exists'}`)

  // Test 4: Check candidates has source fields
  const { data: cand, error: candErr } = await supabase.from('candidates').select('source_person_id').limit(1)
  console.log(`${candErr ? '❌' : '✅'} 129 candidates.source_person_id column: ${candErr ? candErr.message : 'exists'}`)

  // Test 5: Check marketing_resources table
  const {   /workspaces/EmployeeGM-GreenDog/data/marketing/data: mr, error: mrErr } = await supabase.from('marketing_resources').select('id').limit(1)
  console.log(`${mrErr ? '❌' : '✅'} marketing_resources table: ${mrErr ? mrErr.message : 'exists'}`)

  // Test 6: Check marketing_folders table
  const { data: mf, error: mfErr } = await supabase.from('marketing_folders').select('id').limit(1)
  console.log(`${mfErr ? '❌' : '✅'} marketing_folders table: ${mfErr ? mfErr.message : 'exists'}`)

  // Test 7: Check unified_persons
  const { data: up, error: upErr } = await supabase.from('unified_persons').select('id').limit(1)
  console.log(`${upErr ? '❌' : '✅'} unified_persons table: ${upErr ? upErr.message : 'exists'}`)

  // Test 8: Check contact_notes_view
  const { data: cnv, error: cnvErr } = await supabase.from('contact_notes_view').select('id').limit(1)
  console.log(`${cnvErr ? '❌' : '✅'} 130 contact_notes_view: ${cnvErr ? cnvErr.message : 'exists'}`)

  // Write tests
  console.log('\n' + '='.repeat(70))
  console.log('\n🧪 Write Permission Tests (using service role):\n')
  
  const { data: testPpd } = await supabase.from('person_program_data').select('id, program_notes').limit(1).single()
  if (testPpd) {
    const testNote = `Test ${Date.now()}`
    const { error: writeErr } = await supabase.from('person_program_data').update({ program_notes: testNote }).eq('id', testPpd.id)
    if (writeErr) {
      console.log(`❌ person_program_data WRITE: ${writeErr.message}`)
    } else {
      console.log('✅ person_program_data WRITE: works (service role)')
      await supabase.from('person_program_data').update({ program_notes: testPpd.program_notes }).eq('id', testPpd.id)
    }
  } else {
    console.log('⚠️  No person_program_data records to test')
  }

  // Test contact_notes insert
  const { data: testNote, error: noteErr } = await supabase.from('contact_notes').insert({
    contact_type: 'student',
    contact_id: '00000000-0000-0000-0000-000000000000',
    note: 'Test note - will delete',
    note_type: 'general',
    visibility: 'internal'
  }).select().single()
  
  if (noteErr) {
    console.log(`❌ contact_notes INSERT: ${noteErr.message}`)
  } else {
    console.log('✅ contact_notes INSERT: works')
    await supabase.from('contact_notes').delete().eq('id', testNote.id)
    console.log('✅ contact_notes DELETE: works (cleaned up test)')
  }

  // Test storage upload
  const testBlob = new Blob(['test'], { type: 'text/plain' })
  const testPath = `_test_${Date.now()}.txt`
  const { error: storageErr } = await supabase.storage.from('marketing-resources').upload(testPath, testBlob)
  if (storageErr) {
    console.log(`❌ marketing-resources UPLOAD: ${storageErr.message}`)
  } else {
    console.log('✅ marketing-resources UPLOAD: works')
    await supabase.storage.from('marketing-resources').remove([testPath])
  }

  // Check RPC functions
  console.log('\n' + '='.repeat(70))
  console.log('\n📦 RPC Function Tests:\n')
  
  // Test promote_candidate_to_employee_v2 exists
  const { error: rpcErr1 } = await supabase.rpc('promote_candidate_to_employee_v2', { 
    p_candidate_id: '00000000-0000-0000-0000-000000000000' 
  })
  console.log(`${rpcErr1?.message?.includes('not exist') || rpcErr1?.message?.includes('does not exist') ? '❌' : '✅'} 129 promote_candidate_to_employee_v2: ${rpcErr1 ? (rpcErr1.message.includes('not exist') ? 'NOT FOUND' : 'exists (expected error on dummy ID)') : 'exists'}`)

  // Test convert_student_to_candidate exists
  const { error: rpcErr2 } = await supabase.rpc('convert_student_to_candidate', { 
    p_enrollment_id: '00000000-0000-0000-0000-000000000000' 
  })
  console.log(`${rpcErr2?.message?.includes('not exist') || rpcErr2?.message?.includes('does not exist') ? '❌' : '✅'} 129 convert_student_to_candidate: ${rpcErr2 ? (rpcErr2.message.includes('not exist') ? 'NOT FOUND' : 'exists (expected error on dummy ID)') : 'exists'}`)

  // Test add_contact_note exists
  const { error: rpcErr3 } = await supabase.rpc('add_contact_note', { 
    p_contact_type: 'student',
    p_contact_id: '00000000-0000-0000-0000-000000000000',
    p_note: 'test'
  })
  console.log(`${rpcErr3?.message?.includes('not exist') || rpcErr3?.message?.includes('does not exist') ? '❌' : '✅'} 130 add_contact_note: ${rpcErr3 ? (rpcErr3.message.includes('not exist') ? 'NOT FOUND' : 'exists (expected error)') : 'exists'}`)

  // Test is_marketing_admin exists
  const { data: isMA, error: rpcErr4 } = await supabase.rpc('is_marketing_admin')
  console.log(`${rpcErr4?.message?.includes('not exist') || rpcErr4?.message?.includes('does not exist') ? '❌' : '✅'} 127 is_marketing_admin: ${rpcErr4 ? (rpcErr4.message.includes('not exist') ? 'NOT FOUND' : 'exists') : `exists (returned ${isMA})`}`)

  console.log('\n' + '='.repeat(70))
}

checkMigrations().catch(console.error)
