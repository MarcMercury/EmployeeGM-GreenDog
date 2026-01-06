/**
 * Link Auth Users to Profiles
 * ============================
 * Finds auth users that exist but aren't linked to profiles,
 * and links them by matching email addresses.
 * 
 * Usage: npx tsx scripts/link-auth-to-profiles.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('\n🔗 Link Auth Users to Profiles')
  console.log('================================\n')

  // 1. Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('❌ Failed to fetch auth users:', authError.message)
    process.exit(1)
  }

  const authUsers = authData.users
  console.log(`📧 Found ${authUsers.length} auth users\n`)

  // 2. Get all profiles with their current auth_user_id
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, auth_user_id, first_name, last_name')

  if (profileError) {
    console.error('❌ Failed to fetch profiles:', profileError.message)
    process.exit(1)
  }

  console.log(`👤 Found ${profiles?.length || 0} profiles\n`)

  // 3. Find profiles without auth_user_id that have matching auth users
  let linked = 0
  let alreadyLinked = 0
  let noMatch = 0
  let errors = 0

  for (const profile of profiles || []) {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email

    // Already linked
    if (profile.auth_user_id) {
      alreadyLinked++
      continue
    }

    // Find matching auth user by email
    const matchingAuthUser = authUsers.find(
      u => u.email?.toLowerCase() === profile.email?.toLowerCase()
    )

    if (!matchingAuthUser) {
      console.log(`   ⚪ NO MATCH: ${name} (${profile.email})`)
      noMatch++
      continue
    }

    // Link the auth user to the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ auth_user_id: matchingAuthUser.id })
      .eq('id', profile.id)

    if (updateError) {
      console.log(`   ❌ ERROR: ${name} - ${updateError.message}`)
      errors++
    } else {
      console.log(`   ✅ LINKED: ${name} (${profile.email})`)
      linked++
    }
  }

  // Summary
  console.log('\n================================')
  console.log('📊 Summary:')
  console.log(`   ✅ Newly Linked:    ${linked}`)
  console.log(`   ⏭️  Already Linked:  ${alreadyLinked}`)
  console.log(`   ⚪ No Auth Match:   ${noMatch}`)
  console.log(`   ❌ Errors:          ${errors}`)
  console.log('================================\n')

  if (linked > 0) {
    console.log('🎉 Done! Run check-auth-status.ts to verify.')
  }
}

main().catch(console.error)
