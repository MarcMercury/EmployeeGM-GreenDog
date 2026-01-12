/**
 * Create a single admin user
 * 
 * Run with: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// User details
const USER = {
  email: 'RenDVM@gmail.com',
  password: 'Rugby',
  firstName: 'Ren',
  lastName: 'Garcia',
  position: 'CEO',
  role: 'admin'
}

async function createAdminUser() {
  console.log('\n🐕 Creating Admin User')
  console.log('======================\n')
  console.log(`   Name: ${USER.firstName} ${USER.lastName}`)
  console.log(`   Email: ${USER.email}`)
  console.log(`   Position: ${USER.position}`)
  console.log(`   Role: ${USER.role}\n`)

  // Step 1: Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === USER.email.toLowerCase())
  
  let authUserId: string

  if (existingUser) {
    console.log('⚠️  Auth user already exists, using existing...')
    authUserId = existingUser.id
    
    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      password: USER.password
    })
    if (updateError) {
      console.error('   Failed to update password:', updateError.message)
    } else {
      console.log('   ✅ Password updated')
    }
  } else {
    // Step 2: Create auth user
    console.log('📝 Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: USER.email,
      password: USER.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: USER.firstName,
        last_name: USER.lastName
      }
    })

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message)
      process.exit(1)
    }

    authUserId = authData.user.id
    console.log('   ✅ Auth user created:', authUserId)
  }

  // Step 3: Check/Create profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', USER.email.toLowerCase())
    .single()

  let profileId: string

  if (existingProfile) {
    console.log('⚠️  Profile already exists, updating...')
    profileId = existingProfile.id
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        auth_user_id: authUserId,
        first_name: USER.firstName,
        last_name: USER.lastName,
        role: USER.role
      })
      .eq('id', profileId)

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError.message)
    } else {
      console.log('   ✅ Profile updated')
    }
  } else {
    console.log('📝 Creating profile...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUserId, // Use auth user ID as profile ID
        auth_user_id: authUserId,
        email: USER.email.toLowerCase(),
        first_name: USER.firstName,
        last_name: USER.lastName,
        role: USER.role
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError.message)
      process.exit(1)
    }

    profileId = profileData.id
    console.log('   ✅ Profile created:', profileId)
  }

  // Step 4: Check/Create employee record
  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .or(`email_work.ilike.${USER.email},email_personal.ilike.${USER.email}`)
    .single()

  if (existingEmployee) {
    console.log('⚠️  Employee record already exists, updating...')
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        profile_id: profileId,
        first_name: USER.firstName,
        last_name: USER.lastName,
        job_title: USER.position
      })
      .eq('id', existingEmployee.id)

    if (updateError) {
      console.error('❌ Failed to update employee:', updateError.message)
    } else {
      console.log('   ✅ Employee updated')
    }
  } else {
    console.log('📝 Creating employee record...')
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        profile_id: profileId,
        first_name: USER.firstName,
        last_name: USER.lastName,
        email_work: USER.email.toLowerCase(),
        job_title: USER.position,
        employment_status: 'active',
        hire_date: new Date().toISOString().split('T')[0]
      })
      .select('id')
      .single()

    if (employeeError) {
      console.error('❌ Failed to create employee:', employeeError.message)
      // Don't exit - profile is created, user can still log in
    } else {
      console.log('   ✅ Employee created:', employeeData.id)
    }
  }

  console.log('\n✅ User setup complete!')
  console.log('========================')
  console.log(`   Login Email: ${USER.email}`)
  console.log(`   Password: ${USER.password}`)
  console.log(`   Role: ${USER.role}`)
  console.log('\n   User can now log in at your app URL.\n')
}

createAdminUser().catch(console.error)
