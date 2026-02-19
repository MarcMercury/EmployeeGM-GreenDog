/**
 * Check Event Year Distribution
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

async function checkYearDistribution() {
  console.log('\n📊 EVENT YEAR DISTRIBUTION');
  console.log('═'.repeat(60));
  
  const years = [2024, 2025, 2026, 2027];
  
  for (const year of years) {
    const { count, error } = await supabase
      .from('marketing_events')
      .select('*', { count: 'exact', head: true })
      .gte('event_date', `${year}-01-01`)
      .lt('event_date', `${year + 1}-01-01`);
    
    if (!error && count !== null && count > 0) {
      console.log(`  ${year}: ${count} events`);
      
      // Show sample events for non-2026 years
      if (year !== 2026) {
        const { data: samples } = await supabase
          .from('marketing_events')
          .select('name, event_date, status')
          .gte('event_date', `${year}-01-01`)
          .lt('event_date', `${year + 1}-01-01`)
          .order('event_date')
          .limit(5);
        
        if (samples && samples.length > 0) {
          samples.forEach((event: any) => {
            console.log(`    - ${event.event_date}: ${event.name} (${event.status})`);
          });
        }
      }
    }
  }
  
  console.log('═'.repeat(60));
}

checkYearDistribution();
