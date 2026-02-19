/**
 * Marketing Data Migration Script
 * Purges mock events and imports real marketing data from parsed CSVs
 * 
 * SAFETY: Uses UPSERT for influencers, partners, inventory (preserves existing data)
 * DESTRUCTIVE: Deletes all events (confirmed mock data) and rebuilds from CSVs
 * 
 * Dry run: npx tsx scripts/marketing-data-migration/run-migration.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const DRY_RUN = process.argv.includes('--dry-run');

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

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PARSED_DIR = path.join(__dirname, '../../data/marketing/parsed');

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function readCSV(filename: string): Record<string, any>[] {
  const filepath = path.join(PARSED_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠️ File not found: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });
}

function parseFollowerCount(val: string): number | null {
  if (!val) return null;
  const cleaned = String(val).toUpperCase().replace(/,/g, '');
  if (cleaned.includes('M')) {
    return Math.round(parseFloat(cleaned.replace('M', '')) * 1000000);
  }
  if (cleaned.includes('K')) {
    return Math.round(parseFloat(cleaned.replace('K', '')) * 1000);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function cleanDate(val: string): string | null {
  if (!val || val === 'null') return null;
  // Check for obviously wrong dates (typos like 2035)
  if (val.startsWith('2035')) {
    return val.replace('2035', '2025');
  }
  return val;
}

function extractInstagramHandle(val: string): string {
  if (!val) return '';
  let handle = val.trim().toLowerCase();
  if (handle.includes('instagram.com/')) {
    const match = handle.match(/instagram\.com\/([^/?]+)/);
    if (match) handle = match[1];
  }
  return handle.replace('@', '');
}

function mapEventType(csvType: string): string {
  // Map CSV event types to database allowed values
  const typeMap: Record<string, string> = {
    'Awareness': 'other',
    'awareness': 'other',
    'National Holiday': 'other',
    'Staff Event': 'other',
    'Community Event': 'community_outreach',
    'Major Event': 'pet_expo',
    'Planned Event': 'general',
    'CE Event': 'ce_event',
    'Street Fair': 'street_fair',
    'Open House': 'open_house',
    'Adoption Event': 'adoption_event',
    'Health Fair': 'health_fair',
    'School Visit': 'school_visit',
    'Pet Expo': 'pet_expo',
    'Fundraiser': 'fundraiser'
  };
  
  return typeMap[csvType] || 'other';
}

// ============================================================
// PHASE 1: PURGE MOCK EVENTS
// ============================================================

async function purgeMockEvents(): Promise<void> {
  console.log('\n📛 PHASE 1: PURGING MOCK EVENTS');
  console.log('─'.repeat(50));
  
  // First, get count of existing events
  const { count: beforeCount } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  Current events in database: ${beforeCount || 0}`);

  if (DRY_RUN) {
    console.log(`  🏜️  Would delete ${beforeCount || 0} events and associated leads (dry run — skipped)`);
    return;
  }
  
  // Delete all events (confirmed mock data)
  const { error: deleteError } = await supabase
    .from('marketing_events')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('  ❌ Error deleting events:', deleteError.message);
    throw deleteError;
  }
  
  // Also clean up mock leads
  const { error: leadsError } = await supabase
    .from('marketing_leads')
    .delete()
    .in('source', ['Website', 'Referral', 'Social Media', 'Walk-in', 'Pet Wellness Weekend']);
  
  if (leadsError) {
    console.warn('  ⚠️ Could not delete mock leads:', leadsError.message);
  }
  
  console.log('  ✅ All mock events purged');
}

// ============================================================
// PHASE 2: CREATE PARENT EVENTS
// ============================================================

interface ParentEvent {
  id?: string;
  name: string;
  event_date: string;
  status: string;
  event_type: string;
  location: string;
  description: string;
}

const parentEvents: ParentEvent[] = [
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
    event_type: 'pet_expo',
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

async function createParentEvents(): Promise<Map<string, string>> {
  console.log('\n🎪 PHASE 2: CREATING PARENT EVENTS');
  console.log('─'.repeat(50));
  
  const eventIdMap = new Map<string, string>();
  
  for (const event of parentEvents) {
    const { data, error } = await supabase
      .from('marketing_events')
      .insert(event)
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Failed to create ${event.name}:`, error.message);
    } else {
      eventIdMap.set(event.name, data.id);
      console.log(`  ✅ Created: ${event.name} (${data.id})`);
    }
  }
  
  return eventIdMap;
}

// ============================================================
// PHASE 3: IMPORT COMPLETED EVENTS
// ============================================================

async function importCompletedEvents(): Promise<void> {
  console.log('\n📅 PHASE 3: IMPORTING COMPLETED EVENTS');
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
      event_type: mapEventType(row.event_type || 'Community Event')
    };
    
    const { error } = await supabase.from('marketing_events').insert(eventData);
    
    if (error) {
      console.warn(`  ⚠️ Failed to import "${row.event_name}": ${error.message}`);
    } else {
      imported++;
    }
  }
  
  console.log(`  ✅ Imported ${imported} completed events`);
}

// ============================================================
// PHASE 4: IMPORT SCHEDULED EVENTS
// ============================================================

async function importScheduledEvents(): Promise<void> {
  console.log('\n📆 PHASE 4: IMPORTING SCHEDULED EVENTS');
  console.log('─'.repeat(50));
  
  const events = readCSV('events_scheduled.csv');
  console.log(`  Found ${events.length} scheduled events to import`);
  
  let imported = 0;
  let skipped = 0;
  
  // Filter to only import events with actual dates or significant events
  for (const row of events) {
    if (!row.event_name) continue;
    
    // Skip header rows
    if (row.event_name === 'event_name') continue;
    
    // Skip pure awareness months without dates for now (too many)
    if (!row.event_date && row.event_type === 'Awareness') {
      skipped++;
      continue;
    }
    
    const eventData = {
      name: row.event_name,
      event_date: cleanDate(row.event_date) || '2026-01-01',
      event_type: mapEventType(row.event_type || 'Planned Event'),
      location: row.clinic || null,
      description: row.description || null,
      staffing_needs: row.organizer || null,
      status: row.status === 'awareness' ? 'planned' : (row.status || 'planned')
    };
    
    const { error } = await supabase.from('marketing_events').insert(eventData);
    
    if (error) {
      // Skip duplicates silently
      if (!error.message.includes('duplicate')) {
        console.warn(`  ⚠️ Failed: "${row.event_name}": ${error.message}`);
      }
    } else {
      imported++;
    }
  }
  
  console.log(`  ✅ Imported ${imported} scheduled events (skipped ${skipped} awareness months)`);
}

// ============================================================
// PHASE 5: UPSERT INFLUENCERS
// ============================================================

async function upsertInfluencers(): Promise<void> {
  console.log('\n🌟 PHASE 5: UPSERTING INFLUENCERS');
  console.log('─'.repeat(50));
  
  // Load both influencer files
  const masterInfluencers = readCSV('influencers_master.csv');
  const petchewllaInfluencers = readCSV('influencers_petchewlla_2024.csv');
  
  console.log(`  Master list: ${masterInfluencers.length} influencers`);
  console.log(`  PetChewlla list: ${petchewllaInfluencers.length} influencers`);
  
  let updated = 0;
  let inserted = 0;
  
  // Process master influencers first
  for (const row of masterInfluencers) {
    if (!row.contact_name) continue;
    
    const handle = extractInstagramHandle(row.instagram_handle);
    const email = row.email?.toLowerCase().trim();
    
    // Check if influencer exists by handle or email
    let existing = null;
    if (handle) {
      const { data } = await supabase
        .from('marketing_influencers')
        .select('id, notes')
        .ilike('instagram_handle', handle)
        .maybeSingle();
      existing = data;
    }
    if (!existing && email) {
      const { data } = await supabase
        .from('marketing_influencers')
        .select('id, notes')
        .ilike('email', email)
        .maybeSingle();
      existing = data;
    }
    
    const influencerData: any = {
      contact_name: row.contact_name,
      pet_name: row.pet_name || null,
      phone: row.phone || null,
      email: email || null,
      instagram_handle: handle || null,
      follower_count: parseFollowerCount(row.follower_count),
      agreement_details: row.agreement_details || null,
      promo_code: row.promo_code || null,
      location: row.location || null,
      notes: row.status_notes || null,
      status: 'active'
    };
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('marketing_influencers')
        .update({
          ...influencerData,
          notes: existing.notes 
            ? `${existing.notes}\n---\nUpdated from spreadsheet:\n${influencerData.notes || ''}`
            : influencerData.notes
        })
        .eq('id', existing.id);
      
      if (!error) updated++;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('marketing_influencers')
        .insert(influencerData);
      
      if (!error) inserted++;
    }
  }
  
  // Process PetChewlla influencers (add source tag)
  for (const row of petchewllaInfluencers) {
    if (!row.contact_name) continue;
    
    const handle = extractInstagramHandle(row.instagram_handle || row.contact_name);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('marketing_influencers')
      .select('id, events_attended')
      .or(`instagram_handle.ilike.%${handle}%,contact_name.ilike.%${row.contact_name}%`)
      .maybeSingle();
    
    if (existing) {
      // Add PetChewlla to events attended
      const events = existing.events_attended || [];
      if (!events.includes('PetChewlla 2024')) {
        events.push('PetChewlla 2024');
        await supabase
          .from('marketing_influencers')
          .update({ events_attended: events })
          .eq('id', existing.id);
        updated++;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('marketing_influencers')
        .insert({
          contact_name: row.contact_name,
          instagram_handle: handle,
          notes: 'From PetChewlla 2024 event',
          events_attended: ['PetChewlla 2024'],
          status: 'prospect'
        });
      
      if (!error) inserted++;
    }
  }
  
  console.log(`  ✅ Updated ${updated} existing influencers`);
  console.log(`  ✅ Inserted ${inserted} new influencers`);
}

// ============================================================
// PHASE 6: UPSERT INVENTORY
// ============================================================

async function upsertInventory(): Promise<void> {
  console.log('\n📦 PHASE 6: UPSERTING INVENTORY');
  console.log('─'.repeat(50));
  
  const inventory = readCSV('inventory.csv');
  console.log(`  Found ${inventory.length} inventory items`);
  
  let updated = 0;
  let inserted = 0;
  
  for (const row of inventory) {
    if (!row.item_name) continue;
    
    // Check if item exists
    const { data: existing } = await supabase
      .from('marketing_inventory')
      .select('id')
      .ilike('item_name', row.item_name)
      .maybeSingle();
    
    const itemData = {
      item_name: row.item_name,
      boxes_on_hand: parseInt(row.boxes_on_hand) || 0,
      quantity_venice: parseInt(row.quantity_venice) || 0,
      quantity_sherman_oaks: parseInt(row.quantity_sherman_oaks) || 0,
      quantity_valley: parseInt(row.quantity_valley) || 0,
      reorder_point: parseInt(row.reorder_point) || 100,
      last_ordered: cleanDate(row.last_ordered),
      order_quantity: parseInt(row.order_quantity) || null,
      notes: row.notes || null,
      category: 'supplies' // Default category
    };
    
    // Determine category based on item name
    const nameLower = row.item_name.toLowerCase();
    if (nameLower.includes('brochure') || nameLower.includes('flyer') || nameLower.includes('card')) {
      itemData.category = 'brochures';
    } else if (nameLower.includes('bag') || nameLower.includes('pen') || nameLower.includes('lanyard') || nameLower.includes('magnet')) {
      itemData.category = 'promotional_items';
    } else if (nameLower.includes('scrub') || nameLower.includes('beanie') || nameLower.includes('bandana')) {
      itemData.category = 'apparel';
    }
    
    if (existing) {
      const { error } = await supabase
        .from('marketing_inventory')
        .update(itemData)
        .eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('marketing_inventory')
        .insert(itemData);
      if (!error) inserted++;
    }
  }
  
  console.log(`  ✅ Updated ${updated} existing items`);
  console.log(`  ✅ Inserted ${inserted} new items`);
}

// ============================================================
// PHASE 7: UPSERT PARTNERS/CONTACTS
// ============================================================

async function upsertPartners(): Promise<void> {
  console.log('\n🤝 PHASE 7: UPSERTING PARTNERS & CONTACTS');
  console.log('─'.repeat(50));
  
  // Load all contact/partner files
  const contacts = readCSV('marketing_contacts.csv');
  const petchewllaVendors = readCSV('vendors_petchewlla_2024.csv');
  const gdlandVendors = readCSV('vendors_gd_land_2025.csv');
  
  console.log(`  Marketing contacts: ${contacts.length}`);
  console.log(`  PetChewlla vendors: ${petchewllaVendors.length}`);
  console.log(`  GD LAND vendors: ${gdlandVendors.length}`);
  
  let updated = 0;
  let inserted = 0;
  
  // Helper to determine partner type
  function getPartnerType(tags: string, businessType: string): string {
    const combined = `${tags} ${businessType}`.toLowerCase();
    if (combined.includes('chamber')) return 'chamber';
    if (combined.includes('rescue')) return 'rescue';
    if (combined.includes('food') || combined.includes('drink') || combined.includes('vendor')) return 'food_vendor';
    if (combined.includes('print')) return 'print_vendor';
    if (combined.includes('pet') || combined.includes('dog') || combined.includes('grooming')) return 'pet_business';
    if (combined.includes('exotic')) return 'exotic_shop';
    return 'other';
  }
  
  // Process marketing contacts
  for (const row of contacts) {
    if (!row.business_name) continue;
    
    const email = row.email?.toLowerCase().trim();
    
    // Check if exists
    let existing = null;
    if (email) {
      const { data } = await supabase
        .from('marketing_partners')
        .select('id, notes')
        .ilike('contact_email', email)
        .maybeSingle();
      existing = data;
    }
    if (!existing) {
      const { data } = await supabase
        .from('marketing_partners')
        .select('id, notes')
        .ilike('name', row.business_name)
        .maybeSingle();
      existing = data;
    }
    
    const partnerData: any = {
      name: row.business_name,
      contact_name: row.contact_name || null,
      contact_phone: row.phone || null,
      contact_email: email || null,
      services_provided: row.services_provided || null,
      notes: row.notes || null,
      partner_type: getPartnerType(row.tags || '', row.business_type || ''),
      status: 'active'
    };
    
    if (existing) {
      const { error } = await supabase
        .from('marketing_partners')
        .update({
          ...partnerData,
          notes: existing.notes 
            ? `${existing.notes}\n---\n${row.notes || 'Updated from spreadsheet'}`
            : partnerData.notes
        })
        .eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('marketing_partners')
        .insert(partnerData);
      if (!error) inserted++;
    }
  }
  
  // Process PetChewlla vendors
  for (const row of petchewllaVendors) {
    const name = row.business_name || row.vendor_name;
    if (!name || name === 'Rescues') continue;
    
    const { data: existing } = await supabase
      .from('marketing_partners')
      .select('id, events_attended')
      .ilike('name', `%${name}%`)
      .maybeSingle();
    
    if (existing) {
      const events = existing.events_attended || [];
      if (!events.includes('PetChewlla 2024')) {
        events.push('PetChewlla 2024');
        await supabase
          .from('marketing_partners')
          .update({ events_attended: events })
          .eq('id', existing.id);
        updated++;
      }
    } else {
      const { error } = await supabase
        .from('marketing_partners')
        .insert({
          name: name,
          contact_name: row.contact_name || null,
          contact_email: row.email?.toLowerCase() || null,
          events_attended: ['PetChewlla 2024'],
          partner_type: 'other',
          status: 'prospect',
          notes: 'From PetChewlla 2024 vendor list'
        });
      if (!error) inserted++;
    }
  }
  
  // Process GD LAND vendors
  for (const row of gdlandVendors) {
    const name = row.business_name;
    if (!name || name === 'RESCUES' || name === 'NAME') continue;
    
    const { data: existing } = await supabase
      .from('marketing_partners')
      .select('id, events_attended')
      .ilike('name', `%${name}%`)
      .maybeSingle();
    
    if (existing) {
      const events = existing.events_attended || [];
      if (!events.includes('GD LAND 2025')) {
        events.push('GD LAND 2025');
        await supabase
          .from('marketing_partners')
          .update({ events_attended: events })
          .eq('id', existing.id);
        updated++;
      }
    } else {
      const partnerType = row.category?.toLowerCase().includes('rescue') ? 'rescue' : 'other';
      const { error } = await supabase
        .from('marketing_partners')
        .insert({
          name: name,
          contact_name: row.contact_name || null,
          contact_email: row.email?.toLowerCase() || null,
          contact_phone: row.phone || null,
          events_attended: ['GD LAND 2025'],
          partner_type: partnerType,
          status: 'prospect',
          notes: `From GD LAND 2025 vendor list. Category: ${row.category || 'Unknown'}`
        });
      if (!error) inserted++;
    }
  }
  
  console.log(`  ✅ Updated ${updated} existing partners`);
  console.log(`  ✅ Inserted ${inserted} new partners`);
}

// ============================================================
// PHASE 8: IMPORT RESOURCES/CREDENTIALS
// ============================================================

async function importResources(): Promise<void> {
  console.log('\n🔐 PHASE 8: IMPORTING RESOURCES & CREDENTIALS');
  console.log('─'.repeat(50));
  
  const resources = readCSV('resources_passwords.csv');
  console.log(`  Found ${resources.length} resources to import`);
  
  let inserted = 0;
  let updated = 0;
  
  for (const row of resources) {
    if (!row.site) continue;
    
    // Check if exists by site name
    const { data: existing } = await supabase
      .from('marketing_resources')
      .select('id')
      .ilike('name', `%${row.site}%`)
      .maybeSingle();
    
    const resourceData = {
      name: row.site,
      category: row.category || 'General',
      email: row.email || null,
      notes: [
        row.username ? `Username: ${row.username}` : '',
        row.password ? `Password: ${row.password}` : '',
        row.phone ? `Phone: ${row.phone}` : '',
        row.notes || ''
      ].filter(Boolean).join('\n'),
      admin_only: true, // Mark as admin only since it contains credentials
      is_active: true
    };
    
    if (existing) {
      const { error } = await supabase
        .from('marketing_resources')
        .update(resourceData)
        .eq('id', existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from('marketing_resources')
        .insert(resourceData);
      if (!error) inserted++;
    }
  }
  
  console.log(`  ✅ Updated ${updated} existing resources`);
  console.log(`  ✅ Inserted ${inserted} new resources`);
}

// ============================================================
// PHASE 9: VERIFICATION
// ============================================================

async function verifyImport(): Promise<void> {
  console.log('\n✅ PHASE 9: VERIFICATION');
  console.log('─'.repeat(50));
  
  const tables = [
    'marketing_events',
    'marketing_influencers',
    'marketing_inventory',
    'marketing_partners',
    'marketing_resources'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`  📊 ${table}: ${count} records`);
    }
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('MARKETING DATA MIGRATION');
  if (DRY_RUN) console.log('🏜️  DRY RUN — no data will be modified');
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  
  try {
    await purgeMockEvents();

    if (DRY_RUN) {
      console.log('\n🏜️  DRY RUN complete. Remaining phases (insert/upsert) skipped.');
      console.log('    Re-run without --dry-run to apply changes.');
      return;
    }

    await createParentEvents();
    await importCompletedEvents();
    await importScheduledEvents();
    await upsertInfluencers();
    await upsertInventory();
    await upsertPartners();
    await importResources();
    await verifyImport();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  }
}

main();
