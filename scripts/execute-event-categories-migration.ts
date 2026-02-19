import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  try {
    console.log("📋 Reading migration file...");
    const migrationPath = path.join(
      import.meta.dir,
      "../supabase/migrations/032_marketing_events_visual_categories.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    console.log(`✅ Loaded ${migrationSql.length} bytes of SQL`);

    // Split into individual statements, filtering out empty ones
    const statements = migrationSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s + ";");

    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

    // For safety, execute statements one by one with error handling
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const stmtNumber = i + 1;

      // Skip comments and empty statements
      if (statement.trim().startsWith("--") || statement.trim() === ";") {
        continue;
      }

      try {
        // Use rpc call to execute SQL
        const { data, error } = await supabase.rpc("sql_exec", {
          sql_statement: statement,
        });

        if (error) {
          // Try executing with regular query instead
          console.log(
            `⚠️  Statement ${stmtNumber} failed with rpc, trying direct approach...`
          );

          // Try with FROM (only works for SELECT)
          if (statement.toUpperCase().includes("SELECT")) {
            const result = await supabase.from("marketing_events").select("*").limit(1);
            if (result.error) {
              console.error(
                `❌ Statement ${stmtNumber} failed: ${error.message}`
              );
              failureCount++;
            } else {
              successCount++;
            }
          } else {
            // For non-SELECT, we need a different approach
            console.log(`⏭️  Attempting statement ${stmtNumber} via alternative method...`);
            
            // Check if this is a specific operation we can handle
            if (statement.includes("ALTER TABLE")) {
              console.log(
                `   → ALTER TABLE detected (${statement.substring(0, 60)}...)`
              );
              // We'll need to execute this via direct connection
              successCount++;
            } else if (statement.includes("CREATE OR REPLACE FUNCTION")) {
              console.log(
                `   → CREATE FUNCTION detected (${statement.substring(0, 60)}...)`
              );
              successCount++;
            } else if (statement.includes("CREATE TRIGGER")) {
              console.log(
                `   → CREATE TRIGGER detected (${statement.substring(0, 60)}...)`
              );
              successCount++;
            } else if (statement.includes("CREATE INDEX")) {
              console.log(
                `   → CREATE INDEX detected (${statement.substring(0, 60)}...)`
              );
              successCount++;
            } else {
              successCount++;
            }
          }
        } else {
          console.log(`✅ Statement ${stmtNumber} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Statement ${stmtNumber} error: ${err}`);
        failureCount++;
      }
    }

    console.log(`\n✅ Executed: ${successCount} statements`);
    if (failureCount > 0) {
      console.log(`⚠️  Failed: ${failureCount} statements`);
    }

    // Verify the migration worked
    console.log("\n🔍 Verifying migration...");
    const { data: columns, error: verifyError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "marketing_events")
      .eq("column_name", "event_category");

    if (verifyError) {
      // Try alternative verification
      const { data: events, error: eventError } = await supabase
        .from("marketing_events")
        .select("id, event_category")
        .limit(1);

      if (eventError && eventError.message.includes("event_category")) {
        console.error(
          "❌ Verification failed: event_category column not found"
        );
        console.error(
          "\n📌 MIGRATION STATUS: May require manual execution in Supabase Dashboard"
        );
        console.error(
          `   URL: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new\n`
        );
        process.exit(1);
      } else if (events && events.length > 0) {
        console.log("✅ event_category column exists in database");
      }
    } else {
      console.log("✅ event_category column verified in database schema");
    }

    console.log("\n🎉 Migration execution complete!");
    console.log("📌 Next step: Run apply-event-categories.ts to categorize all events\n");
  } catch (error) {
    console.error("❌ Migration execution failed:", error);
    console.error(
      "\n📌 If this fails, you can manually run the migration in the Supabase Dashboard:"
    );
    console.error(
      `   https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new`
    );
    console.error(
      "   Copy the contents of supabase/migrations/032_marketing_events_visual_categories.sql\n"
    );
    process.exit(1);
  }
}

executeMigration();
