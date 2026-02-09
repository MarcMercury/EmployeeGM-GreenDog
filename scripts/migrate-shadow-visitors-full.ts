/**
 * Script to FULLY migrate Shadow Interview visitors from Visitor CRM to Candidates Pipeline
 * This will:
 * 1. Find all shadow/interviewee visitors in education_visitors
 * 2. Add any missing ones to candidates table
 * 3. DELETE the migrated records from education_visitors (not just mark inactive)
 * 
 * Run with: npx tsx scripts/migrate-shadow-visitors-full.ts
 * Dry run:  npx tsx scripts/migrate-shadow-visitors-full.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const DRY_RUN = process.argv.includes('--dry-run')

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateShadowVisitors() {
  if (DRY_RUN) console.log('🏜️  DRY RUN — no data will be modified\n')
  console.log('🔍 Finding all shadow interview visitors in Visitor CRM...\n')

  // Step 1: Find all shadow interview visitors
  const { data: shadowVisitors, error: fetchError } = await supabase
    .from('education_visitors')
    .select('*')
    .or('program_name.ilike.%Interviewee%,program_name.ilike.%Shadow%Interview%,visitor_type.eq.shadow')

  if (fetchError) {
    console.error('❌ Error fetching visitors:', fetchError.message)
    return
  }

  if (!shadowVisitors || shadowVisitors.length === 0) {
    console.log('✅ No shadow interview visitors found to migrate.')
    return
  }

  console.log(`📋 Found ${shadowVisitors.length} shadow interview visitors:\n`)
  shadowVisitors.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.first_name} ${v.last_name} (${v.email || 'no email'}) - ${v.program_name || v.visitor_type}`)
  })

  // Step 2: Check which ones are already in candidates table
  const emails = shadowVisitors
    .filter(v => v.email)
    .map(v => v.email!.toLowerCase())

  const { data: existingCandidates } = await supabase
    .from('candidates')
    .select('email')
    .in('email', emails)

  const existingEmails = new Set((existingCandidates || []).map(c => c.email?.toLowerCase()))

  // Step 3: Add missing visitors to candidates table
  const toAdd = shadowVisitors.filter(v => {
    if (!v.email) return false // Skip if no email
    return !existingEmails.has(v.email.toLowerCase())
  })

  console.log(`\n📊 Migration Summary:`)
  console.log(`   - Already in candidates: ${existingEmails.size}`)
  console.log(`   - Need to add: ${toAdd.length}`)
  console.log(`   - Will delete from visitors: ${shadowVisitors.length}`)

  if (toAdd.length > 0) {
    console.log(`\n➕ Adding ${toAdd.length} new candidates...`)

    for (const visitor of toAdd) {
      const candidateData = {
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        email: visitor.email,
        phone: visitor.phone || null,
        source: 'Shadow Interview',
        status: 'interview', // Already interviewed via shadow
        notes: `Migrated from Visitor CRM. Original program: ${visitor.program_name || visitor.visitor_type}. ${visitor.notes || ''}`.trim(),
        resume_url: visitor.file_link || null
      }

      if (DRY_RUN) {
        console.log(`   🏜️  Would add: ${visitor.first_name} ${visitor.last_name}`)
        continue
      }

      const { error: insertError } = await supabase
        .from('candidates')
        .insert(candidateData)

      if (insertError) {
        console.error(`   ❌ Failed to add ${visitor.first_name} ${visitor.last_name}: ${insertError.message}`)
      } else {
        console.log(`   ✅ Added: ${visitor.first_name} ${visitor.last_name}`)
      }
    }
  }

  // Step 4: DELETE all shadow visitors from education_visitors
  console.log(`\n🗑️  Deleting ${shadowVisitors.length} shadow visitors from Visitor CRM...`)

  if (DRY_RUN) {
    console.log(`   🏜️  Would delete ${shadowVisitors.length} visitors (dry run — skipped)`)
    console.log('\n🏜️  DRY RUN complete. Re-run without --dry-run to apply changes.')
    return
  }

  const visitorIds = shadowVisitors.map(v => v.id)

  const { error: deleteError, count } = await supabase
    .from('education_visitors')
    .delete()
    .in('id', visitorIds)

  if (deleteError) {
    console.error(`   ❌ Delete failed: ${deleteError.message}`)
  } else {
    console.log(`   ✅ Deleted ${count || shadowVisitors.length} visitors from Visitor CRM`)
  }

  console.log('\n🎉 Migration complete!')
  console.log('   Shadow interview leads are now in Recruiting Pipeline only.')
}

migrateShadowVisitors().catch(console.error)
