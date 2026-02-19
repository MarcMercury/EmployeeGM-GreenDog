/**
 * Fix Marketing Events Year - Update 2025 to 2026
 * The calendar was for 2026 but was imported with 2025 dates
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEventYears() {
  console.log('\n🔧 FIXING EVENT YEARS: 2025 → 2026');
  console.log('═'.repeat(60));
  
  // Get all events with 2025 dates
  const { data: events2025, error: fetchError } = await supabase
    .from('marketing_events')
    .select('id, name, event_date')
    .gte('event_date', '2025-01-01')
    .lt('event_date', '2026-01-01')
    .order('event_date');
  
  if (fetchError) {
    console.error('❌ Error fetching events:', fetchError.message);
    return;
  }
  
  if (!events2025 || events2025.length === 0) {
    console.log('✅ No events found with 2025 dates');
    return;
  }
  
  console.log(`\n📅 Found ${events2025.length} events with 2025 dates`);
  console.log('Converting to 2026...\n');
  
  let updated = 0;
  let errors = 0;
  
  for (const event of events2025) {
    // Convert date from 2025 to 2026
    const oldDate = new Date(event.event_date);
    const newDate = new Date(oldDate);
    newDate.setFullYear(2026);
    const newDateString = newDate.toISOString().split('T')[0];
    
    const { error: updateError } = await supabase
      .from('marketing_events')
      .update({ event_date: newDateString })
      .eq('id', event.id);
    
    if (updateError) {
      console.error(`  ❌ Failed to update "${event.name}": ${updateError.message}`);
      errors++;
    } else {
      updated++;
      if (updated <= 5 || updated % 50 === 0) {
        console.log(`  ✅ ${event.event_date} → ${newDateString}: ${event.name}`);
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Updated ${updated} events`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors encountered`);
  }
  
  // Verify the fix
  const { count: count2025 } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true })
    .gte('event_date', '2025-01-01')
    .lt('event_date', '2026-01-01');
  
  const { count: count2026 } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true })
    .gte('event_date', '2026-01-01')
    .lt('event_date', '2027-01-01');
  
  console.log('\n📊 Verification:');
  console.log(`  2025 events: ${count2025 || 0}`);
  console.log(`  2026 events: ${count2026 || 0}`);
  console.log('═'.repeat(60));
}

fixEventYears();
