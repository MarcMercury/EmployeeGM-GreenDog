/**
 * Script to move Shadow Interview visitors from Visitor CRM to Candidates Pipeline
 * Run with: npx tsx scripts/move-shadow-visitors.ts
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function moveShadowVisitorsToCandidates() {
  console.log('🔍 Finding shadow interview visitors in Visitor CRM...\n')
  
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
    console.log(`  ${i + 1}. ${v.first_name} ${v.last_name || ''} - Program: ${v.program_name} - Status: ${v.visit_status}`)
  })
  
  // Step 2: Check which ones already exist in candidates
  const { data: existingCandidates } = await supabase
    .from('candidates')
    .select('first_name, last_name, email')
  
  const existingNames = new Set(
    (existingCandidates || []).map(c => 
      `${c.first_name.toLowerCase()}|${(c.last_name || '').toLowerCase()}`
    )
  )
  
  // Step 3: Filter to only non-duplicates
  const toMigrate = shadowVisitors.filter(v => {
    const key = `${v.first_name.toLowerCase()}|${(v.last_name || '').toLowerCase()}`
    return !existingNames.has(key)
  })
  
  console.log(`\n📊 ${shadowVisitors.length - toMigrate.length} already exist in candidates, ${toMigrate.length} to migrate\n`)
  
  if (toMigrate.length === 0) {
    console.log('✅ All shadow visitors already exist in candidates pipeline.')
    
    // Still mark them as migrated in visitor CRM
    const visitorIds = shadowVisitors.map(v => v.id)
    await markVisitorsAsMigrated(visitorIds)
    return
  }
  
  // Step 4: Insert new candidates
  let successCount = 0
  let errorCount = 0
  
  for (const visitor of toMigrate) {
    const candidateData = {
      first_name: visitor.first_name,
      last_name: visitor.last_name || '',
      email: visitor.email || 
        `${visitor.first_name.toLowerCase().replace(/\s+/g, '')}.${(visitor.last_name || 'unknown').toLowerCase().replace(/\s+/g, '')}@candidate.greendog.vet`,
      phone: visitor.phone || null,
      status: visitor.visit_status === 'done' ? 'interview' : 'screening',
      source: 'Shadow Interview',
      notes: [
        'Migrated from Visitor CRM',
        `Program: ${visitor.program_name}`,
        visitor.visit_start_date ? `Visit Date: ${visitor.visit_start_date}` : null,
        visitor.coordinator ? `Coordinator: ${visitor.coordinator}` : null,
        visitor.mentor ? `Mentor: ${visitor.mentor}` : null,
        visitor.location ? `Location: ${visitor.location}` : null,
        visitor.visit_status ? `Shadow Status: ${visitor.visit_status}` : null,
        visitor.notes
      ].filter(Boolean).join('\n'),
      applied_at: visitor.visit_start_date || new Date().toISOString()
    }
    
    const { error: insertError } = await supabase
      .from('candidates')
      .insert(candidateData)
    
    if (insertError) {
      console.error(`  ❌ Failed to insert ${visitor.first_name} ${visitor.last_name}: ${insertError.message}`)
      errorCount++
    } else {
      console.log(`  ✅ Migrated: ${visitor.first_name} ${visitor.last_name}`)
      successCount++
    }
  }
  
  // Step 5: Mark all shadow visitors as migrated
  const visitorIds = shadowVisitors.map(v => v.id)
  await markVisitorsAsMigrated(visitorIds)
  
  console.log(`\n🎉 Migration complete!`)
  console.log(`   ✅ ${successCount} candidates added to recruiting pipeline`)
  console.log(`   ⚠️  ${errorCount} errors`)
  console.log(`   📝 ${shadowVisitors.length} visitors marked as migrated in Visitor CRM`)
}

async function markVisitorsAsMigrated(visitorIds: string[]) {
  const { error } = await supabase
    .from('education_visitors')
    .update({ is_active: false })
    .in('id', visitorIds)
  
  if (error) {
    console.error('⚠️  Could not mark visitors as migrated:', error.message)
  }
}

// Run the migration
moveShadowVisitorsToCandidates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
