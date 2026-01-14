// Script to run SQL migrations via Supabase Management API
// Usage: node scripts/push-migration.js <migration_file>

const fs = require('fs');
const path = require('path');

async function runMigration(sqlFile) {
  // Load environment variables
  require('dotenv').config();
  
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  
  // Read SQL file
  const sqlPath = path.resolve(sqlFile);
  if (!fs.existsSync(sqlPath)) {
    console.error(`File not found: ${sqlPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Running migration: ${sqlFile}`);
  console.log(`SQL length: ${sql.length} characters`);
  
  // Execute via PostgREST RPC (if you have a run_sql function)
  // Or use pg directly
  try {
    // Try using the pg module if available
    const { Pool } = require('pg');
    
    // Build connection string
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
    const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;
    
    const pool = new Pool({ connectionString });
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Executing SQL...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    client.release();
    await pool.end();
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    
    // Fallback: Save SQL to clipboard-friendly format
    console.log('\n📋 Copy the SQL below and run in Supabase Dashboard:');
    console.log(`   ${SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/_/sql/new')}`);
    console.log('\n--- SQL START ---\n');
    console.log(sql.substring(0, 2000) + (sql.length > 2000 ? '\n... (truncated)' : ''));
    console.log('\n--- SQL END ---\n');
    
    process.exit(1);
  }
}

// Get file from command line args
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.log('Usage: node scripts/push-migration.js <path/to/migration.sql>');
  console.log('Example: node scripts/push-migration.js supabase/migrations/121_student_program_extension.sql');
  process.exit(1);
}

runMigration(sqlFile);
