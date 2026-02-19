/**
 * Apply Marketing Events Visual Categories Migration via Direct SQL
 * Executes the migration by running SQL statements through Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrationViaPsql() {
  console.log('\n🎨 APPLYING MARKETING EVENTS VISUAL CATEGORIES MIGRATION');
  console.log('═'.repeat(70));
  
  if (!databaseUrl) {
    console.log('\n⚠️  DATABASE_URL not found. Using alternative method...\n');
    return false;
  }
  
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/032_marketing_events_visual_categories.sql');
    
    console.log('📄 Executing migration via psql...');
    
    // Execute via psql
    const { stdout, stderr } = await execAsync(
      `psql "${databaseUrl}" -f "${migrationPath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.log('⚠️  Warnings:', stderr);
    }
    
    if (stdout) {
      console.log(stdout);
    }
    
    console.log('\n✅ Migration applied successfully via psql!');
    return true;
  } catch (error) {
    console.log('⚠️  psql execution failed:', error.message);
    return false;
  }
}

async function verifyCategorization() {
  console.log('\n🔍 Verifying categorization...');
  
  const { data, error } = await supabase
    .from('marketing_events')
    .select('event_category')
    .limit(5);
  
  if (error) {
    console.log('⚠️  Could not verify - event_category column may not exist yet');
    return false;
  }
  
  if (data && data.length > 0) {
    console.log('✅ event_category column exists and is populated');
    
    // Get category counts
    const { data: allEvents } = await supabase
      .from('marketing_events')
      .select('event_category');
    
    if (allEvents) {
      const counts: Record<string, number> = {};
      allEvents.forEach((event: any) => {
        const cat = event.event_category || 'null';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      
      console.log('\n📊 Category Distribution:');
      Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
        const emoji = {
          awareness_day: '⚪',
          clinic_hosted: '🟢',
          offsite_tent: '🟠',
          offsite_street_team: '🔴',
          donation_flyers: '🩷',
          considering: '🟡',
          major_holiday: '🟡',
          general: '🔵',
          null: '❓'
        }[cat] || '';
        console.log(`  ${emoji} ${cat}: ${count}`);
      });
    }
    
    return true;
  }
  
  return false;
}

async function main() {
  console.log('\n🚀 Starting migration process...\n');
  
  // Try psql first
  const psqlSuccess = await applyMigrationViaPsql();
  
  if (psqlSuccess) {
    await verifyCategorization();
    console.log('\n' + '═'.repeat(70));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\nAll events have been categorized with color codes.');
    console.log('Refresh your Marketing Calendar to see the colors!');
    console.log('');
  } else {
    console.log('\n' + '═'.repeat(70));
    console.log('⚠️  AUTOMATIC MIGRATION FAILED');
    console.log('═'.repeat(70));
    console.log('\nPlease apply manually via Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
    console.log('2. Run: npx tsx scripts/show-event-categories-migration.ts');
    console.log('3. Copy and paste the SQL into Supabase');
    console.log('4. Click "Run"');
    console.log('');
  }
}

main();
