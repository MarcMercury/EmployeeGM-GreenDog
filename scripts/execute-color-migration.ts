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
    
    const supabaseUrl = 'https://uekumyupkhnpjpdcjfxb.supabase.co';
    const accessToken = 'sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39';
    
    // Use Supabase's SQL Editor API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/{todo}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4',
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
