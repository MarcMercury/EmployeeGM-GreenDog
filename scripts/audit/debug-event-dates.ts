/**
 * Debug Event Dates - Check exact format
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

async function debugEventDates() {
  console.log('\n🔍 DEBUGGING EVENT DATES');
  console.log('═'.repeat(60));
  
  // Get sample events from February 2026
  const { data: febEvents, error } = await supabase
    .from('marketing_events')
    .select('id, name, event_date, status, event_type')
    .gte('event_date', '2026-02-01')
    .lte('event_date', '2026-02-28')
    .order('event_date')
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!febEvents || febEvents.length === 0) {
    console.log('⚠️ No events found in February 2026');
    
    // Check if there are ANY events
    const { count } = await supabase
      .from('marketing_events')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total events in database: ${count}`);
    
    // Get a few sample events
    const { data: samples } = await supabase
      .from('marketing_events')
      .select('id, name, event_date, status')
      .order('event_date')
      .limit(5);
    
    if (samples) {
      console.log('\nFirst 5 events in database:');
      samples.forEach((e: any) => {
        console.log(`  ${e.event_date} | ${e.name} (${e.status})`);
        console.log(`    Type: ${typeof e.event_date}`);
        console.log(`    Value: ${JSON.stringify(e.event_date)}`);
      });
    }
  } else {
    console.log(`\n Found ${febEvents.length} events in February 2026:`);
    febEvents.forEach((event: any) => {
      console.log(`\n  ${event.name}`);
      console.log(`    Date: ${event.event_date}`);
      console.log(`    Type: ${typeof event.event_date}`);
      console.log(`    Status: ${event.status}`);
      console.log(`    Event Type: ${event.event_type}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
}

debugEventDates();
