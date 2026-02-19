/**
 * Apply Marketing Events Visual Categories Migration (SQL Direct)
 * Manually adds the event_category column via SQL execution
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\n🎨 MARKETING EVENTS VISUAL CATEGORIES MIGRATION');
console.log('═'.repeat(70));
console.log('\n⚠️  This migration requires direct SQL execution in Supabase Dashboard\n');
console.log('Please follow these steps:');
console.log('\n1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
console.log('2. Copy and paste the SQL below');
console.log('3. Click "Run" to execute');
console.log('4. Then run: npx tsx scripts/apply-event-categories.ts');
console.log('\n' + '═'.repeat(70));
console.log('\n--- SQL TO EXECUTE ---\n');

// Read and display the migration SQL
const migrationPath = path.join(__dirname, '../supabase/migrations/032_marketing_events_visual_categories.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log(migrationSQL);

console.log('\n' + '═'.repeat(70));
console.log('After running the SQL above, execute the categorization script:');
console.log('  npx tsx scripts/apply-event-categories.ts');
console.log('═'.repeat(70) + '\n');
