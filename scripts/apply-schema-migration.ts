/**
 * Script to apply database schema changes via Supabase Management API
 * Uses the exec_sql RPC endpoint to run DDL commands
 */

import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

// DDL SQL to add the columns
const migrationSQL = `
-- Add level_descriptions column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_library' 
    AND column_name = 'level_descriptions'
  ) THEN
    ALTER TABLE public.skill_library ADD COLUMN level_descriptions JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added level_descriptions column';
  ELSE
    RAISE NOTICE 'level_descriptions column already exists';
  END IF;
END $$;

-- Add is_active column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_library' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.skill_library ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column';
  ELSE
    RAISE NOTICE 'is_active column already exists';
  END IF;
END $$;

-- Add updated_at column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'skill_library' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.skill_library ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_skill_library_category ON public.skill_library(category);

-- Create index on is_active
CREATE INDEX IF NOT EXISTS idx_skill_library_active ON public.skill_library(is_active);

SELECT 'Migration complete' as status;
`

async function runMigration() {
  console.log('=== Applying Schema Migration ===\n')
  console.log(`Project: ${projectRef}`)
  
  // Try using the RPC endpoint with a function if it exists
  // Otherwise, provide instructions
  
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ sql: migrationSQL })
  })
  
  if (response.ok) {
    const result = await response.json()
    console.log('✅ Migration executed successfully!')
    console.log(result)
  } else if (response.status === 404) {
    // exec_sql function doesn't exist, need to create it or use alternative
    console.log('\n⚠️ The exec_sql RPC function does not exist.')
    console.log('\nPlease run the following SQL in the Supabase SQL Editor:')
    console.log('URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
    console.log('\n' + '='.repeat(60))
    console.log(migrationSQL)
    console.log('='.repeat(60))
    console.log('\nAfter running the above SQL, run: npx tsx scripts/apply-skills-migration.ts')
  } else {
    const error = await response.text()
    console.error('Error:', response.status, error)
  }
}

runMigration().catch(console.error)
