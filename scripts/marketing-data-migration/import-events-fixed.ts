/**
 * Marketing Events Import - Fixed Version
 * Uses valid event_type values from the database constraint
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PARSED_DIR = path.join(__dirname, '../../data/marketing/parsed');

// Valid event types from database constraint
const VALID_EVENT_TYPES = [
  'general', 'ce_event', 'street_fair', 'open_house', 
  'adoption_event', 'community_outreach', 'health_fair', 
  'school_visit', 'pet_expo', 'fundraiser', 'other'
];

function readCSV(filename: string): Record<string, any>[] {
  const filepath = path.join(PARSED_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠️ File not found: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });
}

function cleanDate(val: string): string | null {
  if (!val || val === 'null') return null;
  // Fix obviously wrong dates (typos like 2035)
  if (val.startsWith('2035')) {
    return val.replace('2035', '2025');
  }
  return val;
}

// Map event names/types to valid database event types
function mapEventType(eventName: string, eventType: string): string {
  const combined = `${eventName} ${eventType}`.toLowerCase();
  
  if (combined.includes('adoption') || combined.includes('rescue') || combined.includes('shelter')) {
    return 'adoption_event';
  }
  if (combined.includes('fair') || combined.includes('fest') || combined.includes('street')) {
    return 'street_fair';
  }
  if (combined.includes('health') || combined.includes('wellness') || combined.includes('vaccination')) {
    return 'health_fair';
  }
  if (combined.includes('expo') || combined.includes('show') || combined.includes('petchewlla')) {
    return 'pet_expo';
  }
  if (combined.includes('open house') || combined.includes('grand opening')) {
    return 'open_house';
  }
  if (combined.includes('ce ') || combined.includes('continuing education') || combined.includes('training')) {
    return 'ce_event';
  }
  if (combined.includes('fundrais') || combined.includes('charity') || combined.includes('benefit')) {
    return 'fundraiser';
  }
  if (combined.includes('school') || combined.includes('education') || combined.includes('student')) {
    return 'school_visit';
  }
  if (combined.includes('community') || combined.includes('outreach') || combined.includes('awareness')) {
    return 'community_outreach';
  }
  
  return 'general';
}

// ============================================================
// PARENT EVENTS
// ============================================================

const parentEvents = [
  {
    name: 'PetChewlla 2024',
    event_date: '2024-02-09',
    status: 'completed',
    event_type: 'pet_expo',
    location: 'Los Angeles, CA',
    description: 'Annual pet festival with vendors, influencers, and rescue partners'
  },
  {
    name: 'GD LAND 2025',
    event_date: '2025-12-06',
    status: 'completed',
    event_type: 'open_house',
    location: 'Green Dog Dental',
    description: 'Green Dog Land 2025 holiday event with vendors and rescues'
  },
  {
    name: 'Adoptapalooza 2025',
    event_date: '2025-02-22',
    status: 'completed',
    event_type: 'adoption_event',
    location: 'Venice, CA',
    description: 'Annual adoption event partnering with local rescues'
  }
];

async function createParentEvents(): Promise<void> {
  console.log('\n🎪 CREATING PARENT EVENTS');
  console.log('─'.repeat(50));
  
  for (const event of parentEvents) {
    const { data, error } = await supabase
      .from('marketing_events')
      .insert(event)
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Failed to create ${event.name}:`, error.message);
    } else {
      console.log(`  ✅ Created: ${event.name} (${data.id})`);
    }
  }
}

// ============================================================
// COMPLETED EVENTS
// ============================================================

async function importCompletedEvents(): Promise<void> {
  console.log('\n📅 IMPORTING COMPLETED EVENTS');
  console.log('─'.repeat(50));
  
  const events = readCSV('events_completed.csv');
  console.log(`  Found ${events.length} completed events to import`);
  
  let imported = 0;
  for (const row of events) {
    if (!row.event_name || row.event_name === 'event_name') continue;
    
    const eventData = {
      name: row.event_name,
      event_date: cleanDate(row.event_date) || '2025-01-01',
      location: row.location || null,
      budget: parseFloat(row.cost) || null,
      actual_attendance: parseInt(row.attendees) || null,
      leads_collected: parseInt(row.leads_collected) || null,
      post_event_notes: row.notes || null,
      status: 'completed',
      event_type: mapEventType(row.event_name, row.event_type || '')
    };
    
    const { error } = await supabase.from('marketing_events').insert(eventData);
    
    if (error) {
      console.warn(`  ⚠️ Failed "${row.event_name}": ${error.message}`);
    } else {
      imported++;
      console.log(`  ✅ ${row.event_name}`);
    }
  }
  
  console.log(`\n  ✅ Imported ${imported} completed events`);
}

// ============================================================
// SCHEDULED EVENTS (Only dated ones, skip awareness months)
// ============================================================

async function importScheduledEvents(): Promise<void> {
  console.log('\n📆 IMPORTING SCHEDULED EVENTS (with dates)');
  console.log('─'.repeat(50));
  
  const events = readCSV('events_scheduled.csv');
  console.log(`  Found ${events.length} total entries`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of events) {
    if (!row.event_name) continue;
    if (row.event_name === 'event_name') continue;
    
    // Skip awareness months and holidays without specific dates
    const eventType = (row.event_type || '').toLowerCase();
    if (eventType === 'awareness' || eventType === 'holiday') {
      skipped++;
      continue;
    }
    
    // Only import if has a valid date
    const eventDate = cleanDate(row.event_date);
    if (!eventDate) {
      skipped++;
      continue;
    }
    
    const eventData = {
      name: row.event_name,
      event_date: eventDate,
      event_type: mapEventType(row.event_name, row.event_type || ''),
      location: row.clinic || null,
      description: row.description || null,
      staffing_needs: row.organizer || null,
      status: 'scheduled'
    };
    
    const { error } = await supabase.from('marketing_events').insert(eventData);
    
    if (error) {
      if (!error.message.includes('duplicate')) {
        console.warn(`  ⚠️ "${row.event_name}": ${error.message}`);
      }
    } else {
      imported++;
    }
  }
  
  console.log(`  ✅ Imported ${imported} scheduled events`);
  console.log(`  ⏭️ Skipped ${skipped} awareness/holiday entries`);
}

// ============================================================
// VERIFY
// ============================================================

async function verify(): Promise<void> {
  console.log('\n✅ VERIFICATION');
  console.log('─'.repeat(50));
  
  const { count, error } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  📊 marketing_events: ${count} records`);
  
  // Show sample of events
  const { data } = await supabase
    .from('marketing_events')
    .select('name, event_date, event_type, status')
    .order('event_date', { ascending: false })
    .limit(10);
  
  console.log('\n  Recent events:');
  data?.forEach(e => {
    console.log(`    - ${e.name} (${e.event_date}) [${e.event_type}] ${e.status}`);
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('MARKETING EVENTS IMPORT - FIXED');
  console.log('═'.repeat(60));
  
  try {
    await createParentEvents();
    await importCompletedEvents();
    await importScheduledEvents();
    await verify();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ EVENTS IMPORT COMPLETE');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ IMPORT FAILED:', error);
    process.exit(1);
  }
}

main();
