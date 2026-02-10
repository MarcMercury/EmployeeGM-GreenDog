#!/bin/bash
# Apply a migration SQL file via the Supabase Management API
# Usage: ./scripts/apply-migration-via-api.sh <migration-file>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <migration-sql-file>"
  exit 1
fi

MIGRATION_FILE="$1"
PROJECT_REF="uekumyupkhnpjpdcjfxb"
ACCESS_TOKEN="sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39"
API_URL="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERROR: File not found: $MIGRATION_FILE"
  exit 1
fi

echo "=== Applying migration: $MIGRATION_FILE ==="
echo "Project: $PROJECT_REF"

# Read the SQL file content
SQL_CONTENT=$(cat "$MIGRATION_FILE")

# Execute via Management API using a temp file for the JSON payload
PAYLOAD_FILE=$(mktemp)
# Use node to properly JSON-encode the SQL
node -e "
  const fs = require('fs');
  const sql = fs.readFileSync('$MIGRATION_FILE', 'utf-8');
  fs.writeFileSync('$PAYLOAD_FILE', JSON.stringify({ query: sql }));
"

RESPONSE=$(curl -s --max-time 60 -w "\n%{http_code}" -X POST \
  "$API_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$PAYLOAD_FILE")

rm -f "$PAYLOAD_FILE"

# Extract HTTP status code (last line) and body (everything before)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "SUCCESS (HTTP $HTTP_CODE)"
  echo "$BODY" | head -5
else
  echo "FAILED (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
