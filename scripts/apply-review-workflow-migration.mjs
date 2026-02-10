/**
 * Apply migration 201: Schedule Review Workflow
 * Uses Supabase Management API to execute raw SQL
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

// Our migration SQL split into logical blocks that can be executed as individual RPC calls
const migrationBlocks = [
  // 1. Drop old constraint, add new one
  `ALTER TABLE schedule_drafts DROP CONSTRAINT IF EXISTS schedule_drafts_status_check`,
  `ALTER TABLE schedule_drafts ADD CONSTRAINT schedule_drafts_status_check CHECK (status IN ('building', 'reviewing', 'validated', 'submitted_for_review', 'approved', 'published', 'archived'))`,
  
  // 2. Add new columns
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`,
  `ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT ''`,
  
  // 3. Indexes
  `CREATE INDEX IF NOT EXISTS idx_schedule_drafts_submitted ON schedule_drafts(status) WHERE status = 'submitted_for_review'`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_drafts_approved ON schedule_drafts(status) WHERE status = 'approved'`,
]

// Functions need to be applied as complete blocks (they contain semicolons internally)
const functionBlocks = [
  // submit_draft_for_review
  fs.readFileSync('supabase/migrations/201_schedule_review_workflow.sql', 'utf8')
    .match(/CREATE OR REPLACE FUNCTION submit_draft_for_review[\s\S]*?\$\$;/)?.[0],
  
  // approve_schedule_draft
  fs.readFileSync('supabase/migrations/201_schedule_review_workflow.sql', 'utf8')
    .match(/CREATE OR REPLACE FUNCTION approve_schedule_draft[\s\S]*?\$\$;/)?.[0],
    
  // request_schedule_changes
  fs.readFileSync('supabase/migrations/201_schedule_review_workflow.sql', 'utf8')
    .match(/CREATE OR REPLACE FUNCTION request_schedule_changes[\s\S]*?\$\$;/)?.[0],
    
  // publish_schedule_draft (updated)
  fs.readFileSync('supabase/migrations/201_schedule_review_workflow.sql', 'utf8')
    .match(/CREATE OR REPLACE FUNCTION publish_schedule_draft[\s\S]*?\$\$;/)?.[0],
  
  // Realtime
  `ALTER PUBLICATION supabase_realtime ADD TABLE draft_slots`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE schedule_drafts`,
  
  // Grants
  `GRANT EXECUTE ON FUNCTION submit_draft_for_review(UUID, TEXT) TO authenticated`,
  `GRANT EXECUTE ON FUNCTION approve_schedule_draft(UUID, TEXT) TO authenticated`,
  `GRANT EXECUTE ON FUNCTION request_schedule_changes(UUID, TEXT) TO authenticated`,
  `GRANT EXECUTE ON FUNCTION publish_schedule_draft(UUID) TO authenticated`,
]

async function applyMigration() {
  console.log('=== Applying Migration 201: Schedule Review Workflow ===\n')
  
  // First, try to use the Supabase SQL Editor API directly
  const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    console.error('Could not extract project ref from URL:', SUPABASE_URL)
    process.exit(1)
  }
  
  const fullSQL = fs.readFileSync('supabase/migrations/201_schedule_review_workflow.sql', 'utf8')
  
  // Try using the Supabase Management API SQL endpoint
  console.log('Attempting to apply via Supabase SQL endpoint...')
  console.log('Project:', projectRef)
  
  // Use the pg-meta endpoint for raw SQL execution
  const resp = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST', 
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: fullSQL })
  })
  
  if (resp.ok) {
    console.log('Migration applied successfully via pg/query!')
    return
  }
  
  console.log(`pg/query returned ${resp.status}, trying statement-by-statement approach...`)
  
  // Statement by statement using the REST API
  let okCount = 0
  let failCount = 0
  
  // Apply DDL statements
  for (const stmt of [...migrationBlocks, ...functionBlocks]) {
    if (!stmt || stmt.trim().length < 5) continue
    
    const displayStmt = stmt.trim().substring(0, 80).replace(/\n/g, ' ')
    
    try {
      // Use the Supabase postgres REST endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'x-pg-meta-raw-query': 'true'
        },
        body: JSON.stringify({ query: stmt })
      })

      if (response.ok) {
        console.log(`✅ ${displayStmt}`)
        okCount++
      } else {
        const errBody = await response.text()
        console.log(`⚠️  ${displayStmt}`)
        console.log(`   Status: ${response.status} - ${errBody.substring(0, 120)}`)
        failCount++
      }
    } catch (e) {
      console.log(`❌ ${displayStmt}`)
      console.log(`   ${e.message}`)
      failCount++
    }
  }
  
  console.log(`\n=== Summary: ${okCount} applied, ${failCount} need manual application ===`)
  
  if (failCount > 0) {
    console.log('\n⚠️  Some statements could not be applied automatically.')
    console.log('Please apply the migration manually via the Supabase SQL Editor:')
    console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`)
    console.log('File: supabase/migrations/201_schedule_review_workflow.sql')
  }
}

applyMigration().catch(console.error)
