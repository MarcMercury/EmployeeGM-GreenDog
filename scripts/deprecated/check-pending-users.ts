import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env file if it exists
config()

// Also try loading from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Please create a .env file with:')
  console.error('  SUPABASE_URL=https://uekumyupkhnpjpdcjfxb.supabase.co')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.error('')
  console.error('Or run with:')
  console.error('  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-pending-users.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkPendingUsers() {
  console.log('=== Checking Pending User Accounts ===\n')

  // Get all pending employees (needs_user_account = true, no auth_user_id on profile)
  const { data: pendingEmployees, error: empError } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email_work,
      email_personal,
      employment_status,
      needs_user_account,
      profile_id,
      profiles:profile_id(id, auth_user_id, email, role)
    `)
    .eq('needs_user_account', true)
    .eq('employment_status', 'active')

  if (empError) {
    console.error('Error fetching employees:', empError)
    return
  }

  console.log(`Found ${pendingEmployees?.length || 0} employees with needs_user_account=true\n`)

  // Get all auth users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Error fetching auth users:', authError)
    return
  }

  // Get all profiles with auth_user_id
  const { data: linkedProfiles } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, first_name, last_name')
    .not('auth_user_id', 'is', null)

  const authUserMap = new Map(authUsers?.map(u => [u.email?.toLowerCase(), u]) || [])
  const authUserIdToProfile = new Map(linkedProfiles?.map(p => [p.auth_user_id, p]) || [])

  let issues = 0
  let canAutoLink = 0
  let clean = 0

  for (const emp of pendingEmployees || []) {
    const name = `${emp.first_name} ${emp.last_name}`
    const profile = emp.profiles as any
    const workEmail = emp.email_work?.toLowerCase()
    const personalEmail = emp.email_personal?.toLowerCase()

    console.log(`\n--- ${name} ---`)
    console.log(`  Work Email: ${emp.email_work || 'N/A'}`)
    console.log(`  Personal Email: ${emp.email_personal || 'N/A'}`)
    console.log(`  Profile ID: ${emp.profile_id}`)
    console.log(`  Profile auth_user_id: ${profile?.auth_user_id || 'NULL (correct for pending)'}`)

    // Check if profile already has auth_user_id
    if (profile?.auth_user_id) {
      console.log(`  ⚠️  ISSUE: Profile already has auth_user_id but needs_user_account=true`)
      console.log(`      FIX: Set needs_user_account=false for employee ${emp.id}`)
      issues++
      continue
    }

    // Check if work email exists in auth
    const authUserWork = workEmail ? authUserMap.get(workEmail) : null
    const authUserPersonal = personalEmail ? authUserMap.get(personalEmail) : null

    if (authUserWork) {
      const linkedTo = authUserIdToProfile.get(authUserWork.id)
      if (linkedTo) {
        console.log(`  ⚠️  ISSUE: Work email already used by auth user linked to another profile`)
        console.log(`      Auth User ID: ${authUserWork.id}`)
        console.log(`      Linked to profile: ${linkedTo.id} (${linkedTo.first_name} ${linkedTo.last_name})`)
        issues++
      } else {
        console.log(`  🔗 ORPHAN: Work email has auth user but not linked to any profile`)
        console.log(`      Auth User ID: ${authUserWork.id}`)
        console.log(`      Can auto-link this auth user to the profile`)
        canAutoLink++
      }
    } else if (authUserPersonal) {
      const linkedTo = authUserIdToProfile.get(authUserPersonal.id)
      if (linkedTo) {
        console.log(`  ⚠️  ISSUE: Personal email already used by auth user linked to another profile`)
        console.log(`      Auth User ID: ${authUserPersonal.id}`)
        console.log(`      Linked to profile: ${linkedTo.id} (${linkedTo.first_name} ${linkedTo.last_name})`)
        issues++
      } else {
        console.log(`  🔗 ORPHAN: Personal email has auth user but not linked to any profile`)
        console.log(`      Auth User ID: ${authUserPersonal.id}`)
        console.log(`      Can auto-link this auth user to the profile`)
        canAutoLink++
      }
    } else {
      console.log(`  ✅ CLEAN: No existing auth users for either email`)
      clean++
    }
  }

  console.log('\n\n=== SUMMARY ===')
  console.log(`Total pending: ${pendingEmployees?.length || 0}`)
  console.log(`✅ Clean (can create new user): ${clean}`)
  console.log(`🔗 Orphaned auth users (will auto-link): ${canAutoLink}`)
  console.log(`⚠️  Issues (need manual resolution): ${issues}`)
}

checkPendingUsers().catch(console.error)
