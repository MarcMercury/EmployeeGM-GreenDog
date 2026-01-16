/**
 * CLEANUP DUPLICATE PROFILES
 * 
 * This script will:
 * 1. Find all auth users we just created
 * 2. For each auth user, find all profiles with that auth_user_id
 * 3. Keep only the profile that's linked to an employee
 * 4. Delete orphan profiles
 * 5. Update the remaining profile with the auth_user_id
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// The auth users we just created
const newAuthUsers = [
  { email: 'greendoglizbeth@gmail.com', auth_id: '057756aa-c390-4f48-9c9e-b17662e28eb7', profile_id: '285558a9-146f-45a5-941f-5785f7a80470' },
  { email: 'greendognaomi@gmail.com', auth_id: '3c73ee30-4662-45b1-96a3-fcb3b729fda2', profile_id: '98a1ecf0-d647-4582-8c8c-097b2c2913d8' },
  { email: 'greendogsaul.g@gmail.com', auth_id: 'cd52f7a9-932d-4777-8e55-2c30530892a6', profile_id: 'c155e4c2-edca-4412-916e-d17210c55202' },
  { email: 'mypetana@gmail.com', auth_id: '39afad61-9655-4f88-a3e8-f322efc64dc4', profile_id: '756927c5-0088-457d-82f0-5f806126152a' },
  { email: 'info@cardiacvet.com', auth_id: 'b403c851-2832-4474-aac6-6684c04bf8e6', profile_id: '9a306ec3-8b83-43f8-b6af-32fbbbc10ef5' },
  { email: 'dogandcatcardio@gmail.com', auth_id: 'e1e22fba-e752-405b-8c21-fe3e03328c92', profile_id: '62457b03-ad69-4641-a742-0e13884134a8' },
  { email: 'mypetgladys@gmail.com', auth_id: '5ee70d6d-21ba-4fbc-9c18-aede2bfe15dc', profile_id: '9c0e8069-af39-4348-8b28-45338c0e30da' },
  { email: 'greendogjisun@gmail.com', auth_id: '49eee342-689c-4c8a-9329-ed5addac2686', profile_id: 'c1d8fa04-1aa9-417f-b693-d6f3f95e27b7' },
  { email: 'greendogleticia@gmail.com', auth_id: '2bf6e564-a370-40d6-8d19-5f0a3b4246dd', profile_id: 'd4b217a5-15d1-47c3-add5-ca06e949db4e' },
  { email: 'greendogtanya@gmail.com', auth_id: '8ed23b96-6718-4dd6-a014-adab2e886229', profile_id: '6405f42c-2538-4c89-b3de-4b013fb8ea78' },
  { email: 'greendogesmeralda@gmail.com', auth_id: '49ce2510-08b2-4044-bcee-34ffdd4a7705', profile_id: '5410b87e-f010-41b1-ac57-ea0916e11229' },
  { email: 'greendoglaura@gmail.com', auth_id: '057b21c7-a7d5-4b63-b81b-7d7d67d0c1f6', profile_id: 'c1765438-1c78-4c49-a4dd-871a5ee6ef45' },
]

async function main() {
  console.log('=' .repeat(60))
  console.log('CLEANING UP PROFILES AND LINKING AUTH USERS')
  console.log('=' .repeat(60))
  console.log()

  for (const user of newAuthUsers) {
    console.log(`\nProcessing: ${user.email}`)
    console.log(`  Target profile_id: ${user.profile_id}`)
    console.log(`  Auth user ID: ${user.auth_id}`)

    // First, check if any profile already has this auth_user_id
    const { data: existingWithAuth } = await supabase
      .from('profiles')
      .select('id, email, auth_user_id')
      .eq('auth_user_id', user.auth_id)

    if (existingWithAuth && existingWithAuth.length > 0) {
      console.log(`  Found ${existingWithAuth.length} profile(s) with this auth_user_id:`)
      for (const p of existingWithAuth) {
        console.log(`    - ${p.id} (${p.email})`)
        
        // If this is NOT the employee's profile, delete it
        if (p.id !== user.profile_id) {
          console.log(`      Deleting orphan profile ${p.id}...`)
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', p.id)
          
          if (deleteError) {
            console.log(`      ❌ Error deleting: ${deleteError.message}`)
          } else {
            console.log(`      ✅ Deleted`)
          }
        }
      }
    }

    // Now update the employee's profile with the auth_user_id
    console.log(`  Updating profile ${user.profile_id} with auth_user_id...`)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        auth_user_id: user.auth_id,
        role: 'user',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.profile_id)

    if (updateError) {
      console.log(`  ❌ Update error: ${updateError.message}`)
    } else {
      console.log(`  ✅ Profile updated successfully`)
    }
  }

  // Verify the final state
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION')
  console.log('='.repeat(60))

  for (const user of newAuthUsers) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, auth_user_id, role')
      .eq('id', user.profile_id)
      .single()

    const status = profile?.auth_user_id === user.auth_id ? '✅' : '❌'
    console.log(`${status} ${user.email}`)
    console.log(`   Profile auth_user_id: ${profile?.auth_user_id || 'NULL'}`)
    console.log(`   Role: ${profile?.role}`)
  }

  // Check if there are any remaining pending users
  console.log('\n' + '='.repeat(60))
  console.log('PENDING USERS CHECK')
  console.log('='.repeat(60))
  
  const { data: stillPending } = await supabase
    .from('employees')
    .select(`
      id, 
      first_name, 
      last_name, 
      email_work,
      needs_user_account,
      profiles:profile_id(id, auth_user_id)
    `)
    .eq('needs_user_account', true)
    .eq('employment_status', 'active')

  const trulyPending = (stillPending || []).filter((e: any) => !e.profiles?.auth_user_id)
  console.log(`\nStill pending: ${trulyPending.length}`)
  for (const emp of trulyPending) {
    console.log(`  - ${emp.first_name} ${emp.last_name}`)
  }
}

main().catch(console.error)
