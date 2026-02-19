/**
 * Verify Marketing Events Import
 * Quick script to check how many events were imported
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

async function verifyImport() {
  console.log('\n✅ MARKETING EVENTS VERIFICATION');
  console.log('═'.repeat(60));
  
  // Count total events
  const { count: totalCount, error: totalError } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('❌ Error counting events:', totalError.message);
    return;
  }
  
  console.log(`\n📊 Total Events: ${totalCount}`);
  
  // Count by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('marketing_events')
    .select('status')
    .order('status');
  
  if (!statusError && statusCounts) {
    const statusMap = statusCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nBy Status:');
    Object.entries(statusMap).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }
  
  // Count by event type
  const { data: typeCounts, error: typeError } = await supabase
    .from('marketing_events')
    .select('event_type')
    .order('event_type');
  
  if (!typeError && typeCounts) {
    const typeMap = typeCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.event_type] = (acc[row.event_type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nBy Event Type:');
    Object.entries(typeMap).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
  
  // Sample recent events
  const { data: recentEvents, error: recentError } = await supabase
    .from('marketing_events')
    .select('name, event_date, event_type, status')
    .order('event_date', { ascending: false })
    .limit(10);
  
  if (!recentError && recentEvents) {
    console.log('\n📅 Most Recent Events (by date):');
    recentEvents.forEach((event: any) => {
      console.log(`  ${event.event_date} | ${event.name} (${event.event_type}, ${event.status})`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Verification Complete');
}

verifyImport();
