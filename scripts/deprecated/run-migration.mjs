// Run a SQL migration file against Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\u274c Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const file = process.argv[2] || 'supabase/migrations/161_schedule_templates_enhance.sql';
const sql = fs.readFileSync(file, 'utf8');

// Run the full SQL via the Supabase REST API (requires pg_graphql or exec_sql function)
// Since we can't run raw SQL directly via JS client, we'll output what needs to run
console.log('SQL Migration to run in Supabase SQL Editor:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));
console.log('\nCopy the above SQL and run it in the Supabase Dashboard SQL Editor');
console.log('https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
