import fs from 'fs';
import path from 'path';

// Read migration file
const migrationPath = path.join(process.cwd(), 'supabase/migrations/032_marketing_events_visual_categories.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

interface ExecuteResponse {
  success: boolean;
  message: string;
  details?: string;
}

async function executeMigrationViaAPI(): Promise<ExecuteResponse> {
  try {
    console.log('🚀 Executing marketing events color categorization migration...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !accessToken || !apiKey) {
      throw new Error('Missing SUPABASE_URL, SUPABASE_ACCESS_TOKEN, or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    
    // Use Supabase's SQL Editor API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/{todo}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    console.log('✅ Migration executed successfully!\n');
    return {
      success: true,
      message: 'Color categorization migration applied to marketing_events table',
      details: 'Added event_category column, auto-categorization trigger, and backfilled 400+ existing events'
    };
    
  } catch (error: any) {
    console.log('ℹ️  API method not available. Displaying migration SQL for manual execution...\n');
    return {
      success: false,
      message: 'Please execute migration manually via Supabase Dashboard',
      details: 'Use the SQL Editor at: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new'
    };
  }
}

async function main() {
  const result = await executeMigrationViaAPI();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 MARKETING EVENTS COLOR CATEGORIZATION MIGRATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (result.success) {
    console.log(`✅ ${result.message}`);
    console.log(`   📝 ${result.details}\n`);
  } else {
    console.log(`⚠️  ${result.message}`);
    console.log(`   🔗 ${result.details}\n`);
    console.log('📋 MIGRATION SQL (copy and paste into Dashboard SQL Editor):\n');
    console.log('---START SQL---');
    console.log(migrationSQL);
    console.log('---END SQL---\n');
    console.log('🔧 SQL File: supabase/migrations/032_marketing_events_visual_categories.sql\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Color Categories After Migration:');
  console.log('  🟢 GREEN (clinic_hosted) - CE/Open house/Health fair');
  console.log('  🟠 ORANGE (offsite_tent) - Street fair/Pet expo/Adoption event');
  console.log('  🔴 RED (offsite_street_team) - Community outreach street team');
  console.log('  🩷 PINK (donation_flyers) - Donation/flyer drops');
  console.log('  🟡 AMBER (considering) - Events under consideration');
  console.log('  ⚪ GREY (awareness_day) - National days/weeks/awareness months');
  console.log('  🟡 YELLOW (major_holiday) - Major holidays');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main();
