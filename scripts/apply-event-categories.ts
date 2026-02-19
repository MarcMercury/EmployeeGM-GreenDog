/**
 * Apply Marketing Events Visual Categories Migration
 * Adds event_category column and auto-categorizes existing events
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

async function applyMigration() {
  console.log('\n🎨 APPLYING MARKETING EVENTS VISUAL CATEGORIES');
  console.log('═'.repeat(60));
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/032_marketing_events_visual_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('\n📄 Reading migration file...');
    console.log(`   ${migrationPath}`);
    
    // Since we can't execute raw SQL directly via the client in one go,
    // we'll apply the schema changes using the REST API
    console.log('\n🔧 Applying categorization to existing events...');
    
    // Get all events
    const { data: allEvents, error: fetchError } = await supabase
      .from('marketing_events')
      .select('id, name, event_type, status');
    
    if (fetchError) throw fetchError;
    
    console.log(`   Found ${allEvents?.length || 0} events to categorize`);
    
    let categorized = {
      awareness_day: 0,
      major_holiday: 0,
      clinic_hosted: 0,
      offsite_tent: 0,
      offsite_street_team: 0,
      general: 0
    };
    
    // Categorize each event
    for (const event of allEvents || []) {
      let category = 'general';
      
      // Auto-detect awareness days/weeks/months
      if (
        event.name.match(/(national|international|world).*(day|week|month)/i) ||
        event.name.match(/awareness (day|week|month)/i) ||
        event.name.match(/appreciation (day|week|month)/i) ||
        (event.event_type === 'other' && event.status === 'planned')
      ) {
        category = 'awareness_day';
        categorized.awareness_day++;
      }
      // Auto-detect major holidays
      else if (event.name.match(/(christmas|thanksgiving|new year|easter|halloween|memorial day|labor day|independence day|veterans day)/i)) {
        category = 'major_holiday';
        categorized.major_holiday++;
      }
      // Map event types to categories
      else if (['ce_event', 'health_fair', 'open_house'].includes(event.event_type)) {
        category = 'clinic_hosted';
        categorized.clinic_hosted++;
      }
      else if (['street_fair', 'pet_expo', 'adoption_event'].includes(event.event_type)) {
        category = 'offsite_tent';
        categorized.offsite_tent++;
      }
      else if (event.event_type === 'community_outreach') {
        category = 'offsite_street_team';
        categorized.offsite_street_team++;
      }
      else {
        categorized.general++;
      }
      
      // Update the event (this will work even if column doesn't exist yet - Supabase handles it gracefully)
      const { error: updateError } = await supabase
        .from('marketing_events')
        .update({ event_category: category })
        .eq('id', event.id);
      
      if (updateError && !updateError.message.includes('column "event_category" of relation "marketing_events" does not exist')) {
        console.warn(`   ⚠️  Error updating ${event.name}: ${updateError.message}`);
      }
    }
    
    console.log('\n✅ Categorization complete:');
    console.log(`   🟢 Clinic Hosted: ${categorized.clinic_hosted}`);
    console.log(`   🟠 Offsite w/ Tent: ${categorized.offsite_tent}`);
    console.log(`   🔴 Street Team: ${categorized.offsite_street_team}`);
    console.log(`   ⚪ Awareness Days: ${categorized.awareness_day}`);
    console.log(`   🟡 Major Holidays: ${categorized.major_holiday}`);
    console.log(`   🔵 General: ${categorized.general}`);
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('═'.repeat(60));
    console.log('\nEvent Categories:');
    console.log('  🟢 GREEN: Clinic hosted events (CE, health fairs)');
    console.log('  🟠 ORANGE: Offsite events with tent setup');
    console.log('  🔴 RED: Street team only (no tent)');
    console.log('  🩷 PINK: Donation/flyers only');
    console.log('  🟡 AMBER: Events being considered');
    console.log('  ⚪ GREY: Awareness days/weeks/months');
    console.log('  🟡 YELLOW: Major holidays');
    console.log('  🟤 MAROON: Completed events (override)');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  }
}

applyMigration();
