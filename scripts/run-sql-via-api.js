// Run SQL directly via Supabase client (bypasses need for db password)
// Usage: node --env-file=.env scripts/run-sql-via-api.js <sql_file>

const fs = require('fs');

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.log('Usage: node --env-file=.env scripts/run-sql-via-api.js <path/to/file.sql>');
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log(`📄 Loaded ${sqlFile} (${sql.length} bytes)`);
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );
  
  // Split SQL into statements and run each
  // This is a simple split - doesn't handle all edge cases
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Found ${statements.length} SQL statements`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length < 10) continue;
    
    try {
      // Use rpc to call a helper function, or raw query
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
      
      if (error) {
        // If exec_sql doesn't exist, we need the db password approach
        console.log(`⚠️  Statement ${i+1}: ${error.message.substring(0, 80)}`);
        failed++;
      } else {
        console.log(`✅ Statement ${i+1} executed`);
        success++;
      }
    } catch (err) {
      console.log(`❌ Statement ${i+1}: ${err.message.substring(0, 80)}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n💡 For full migration support, run SQL directly in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new');
  }
}

main().catch(console.error);
