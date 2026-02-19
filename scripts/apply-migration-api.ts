/**
 * Apply SQL Migration via HTTP API
 * Uses Supabase Management API to execute SQL
 */

import https from 'https';
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

const projectRef = 'uekumyupkhnpjpdcjfxb';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!serviceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/032_marketing_events_visual_categories.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('\n🎨 Applying Marketing Events Visual Categories Migration...\n');

// NOTE: Direct SQL execution via API requires special permissions
// For now, printing instructions
console.log('⚠️  Automated SQL execution requires Supabase Management API access.');
console.log('Please apply the migration manually via Supabase Dashboard:\n');
console.log('1. Open: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
console.log('2. Copy the SQL from: supabase/migrations/032_marketing_events_visual_categories.sql');
console.log('3. Paste and Run\n');
console.log('Or use the migration display script:');
console.log('  npx tsx scripts/show-event-categories-migration.ts\n');
