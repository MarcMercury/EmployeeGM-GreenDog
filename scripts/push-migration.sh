#!/bin/bash

# Execute the migration using psql
# The PostgreSQL connection string format is: postgresql://user:password@host:port/database

# Extract credentials from environment variables
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# For Supabase, the connection string is typically:
# postgresql://postgres:password@db.supabase.co:5432/postgres

# Since we don't have the password directly, we'll try using Supabase connection pooling
# The default superuser is 'postgres' and password should be in environment

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set in environment"
  echo ""
  echo "To set it up, add to your .env:"
  echo "  DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres"
  echo ""
  echo "For Supabase, you can find this in: Settings > Database > Connection string > URI tab"
  echo ""
  
  # Try alternative: Use Supabase connection string format with service role
  # Supabase project: uekumyupkhnpjpdcjfxb
  # Default database: postgres
  # Default user: postgres
  
  # We'll create the psql command interactively if possible, or provide instructions
  echo "📌 Creating migration script for manual execution..."
  
  # Create a SQL script file
  MIGRATION_FILE="supabase/migrations/032_marketing_events_visual_categories.sql"
  
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
  fi
  
  # Instructions for manual execution
  echo ""
  echo "================== MIGRATION EXECUTION INSTRUCTIONS =================="
  echo ""
  echo "🔗 Open your Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new"
  echo ""
  echo "📋 Copy and paste the following SQL into the SQL Editor:"
  echo "---"
  cat "$MIGRATION_FILE"
  echo "---"
  echo ""
  echo "➡️  Click 'Run' to execute the migration"
  echo ""
  echo "After execution, run: npm run apply:event-categories"
  echo ""
  echo "========================================================================"
  
else
  # DATABASE_URL is set, use psql to execute
  echo "📋 Executing migration with psql..."
  
  MIGRATION_FILE="supabase/migrations/032_marketing_events_visual_categories.sql"
  
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
  fi
  
  # Execute the migration
  psql "$DATABASE_URL" -f "$MIGRATION_FILE"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration executed successfully!"
    echo ""
    echo "🔍 Verifying migration..."
    psql "$DATABASE_URL" -c "
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='marketing_events' AND column_name='event_category';
    "
    
    echo ""
    echo "🎉 Migration verification complete!"
    echo "📌 Next step: Run 'npm run apply:event-categories' to categorize all events"
  else
    echo "❌ Migration execution failed"
    exit 1
  fi
fi
