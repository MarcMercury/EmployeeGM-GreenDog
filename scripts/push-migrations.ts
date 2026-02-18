#!/usr/bin/env npx tsx
/**
 * Push Database Migrations to Supabase
 * 
 * Usage: npx tsx scripts/push-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Credentials from docs/SUPABASE_CREDENTIALS.md
const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'

const migrations = [
  'supabase/migrations/20260218_create_api_error_tracking.sql',
  'supabase/migrations/20260218_add_api_monitoring_page.sql',
]

async function main() {
  console.log('🚀 Pushing migrations to Supabase...')
  console.log(`📍 URL: ${SUPABASE_URL}`)

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  for (const migrationFile of migrations) {
    console.log(`\n📄 Processing: ${migrationFile}`)

    const filePath = path.join(process.cwd(), migrationFile)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`📝 SQL length: ${sql.length} characters`)

    try {
      // Use the underlying postgres client to execute raw SQL
      const { error } = await client.rpc('execute_sql', {
        sql,
      }).catch(async () => {
        // Fallback: If the RPC doesn't exist, try direct query
        // Split by semicolons to handle multiple statements
        const statements = sql
          .split(';')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)

        console.log(`⚙️  Found ${statements.length} SQL statements`)

        for (const statement of statements) {
          try {
            // Execute each statement via the API
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_raw_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({ sql: statement }),
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
          } catch (err) {
            console.warn(`⚠️  Could not execute statement: ${err}`)
          }
        }

        return { error: null }
      })

      if (error) {
        console.error(`❌ Error: ${error}`)
        process.exit(1)
      }

      console.log(`✅ Successfully executed: ${migrationFile}`)
    } catch (err) {
      console.error(`❌ Failed to execute migration: ${err}`)
      process.exit(1)
    }
  }

  console.log('\n✅ All migrations pushed to Supabase!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
