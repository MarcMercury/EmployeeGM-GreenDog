# Supabase Operations Guide

> **AI AGENTS:** Reference this file for ALL Supabase database operations.

## Connection Information

| Property | Value |
| -------- | ----- |
| Project Ref | `uekumyupkhnpjpdcjfxb` |
| API URL | `https://uekumyupkhnpjpdcjfxb.supabase.co` |
| PostgreSQL Version | 17.6 |
| Region | AWS |

## Authentication

Access token stored at: `~/.supabase/access-token`

```bash
# Read token
cat ~/.supabase/access-token

# Login (if needed)
npx supabase login
```

## Running Migrations

### Method 1: Supabase Management API (RECOMMENDED)

The CLI `db push` command requires interactive password entry which doesn't work in automation. Use the Management API instead:

```bash
# Read access token
TOKEN=$(cat ~/.supabase/access-token)

# Run SQL via Management API
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{query: .}' < path/to/migration.sql)"
```

### For Large Migrations

Split into chunks at natural boundaries (after `$$;` or `);`):

```bash
# Extract lines and run
sed -n '1,100p' migration.sql > /tmp/chunk.sql
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{query: .}' < /tmp/chunk.sql)"
```

### Record Migration in History

After successful migration:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('\''XXX'\'', '\''XXX_migration_name.sql'\'') ON CONFLICT DO NOTHING;"}'
```

### Check Migration Status

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;"}' | jq .
```

## Common Operations

### Query Table Schema

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''TABLE_NAME'\'' ORDER BY ordinal_position;"}' | jq -r '.[].column_name'
```

### List Tables

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' ORDER BY table_name;"}' | jq -r '.[].table_name'
```

### Check Function Exists

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/uekumyupkhnpjpdcjfxb/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT proname FROM pg_proc WHERE proname = '\''FUNCTION_NAME'\'';"}'
```

## Migration Best Practices

1. **Always check current migration status** before running new migrations
2. **Run in chunks** for files > 200 lines to catch errors early
3. **Remove `-- comments` from chunks** if parsing issues occur
4. **Verify objects created** after each chunk
5. **Record in history** so Supabase CLI stays in sync

## Troubleshooting

### "INTO specified more than once"
PostgreSQL doesn't support `RETURNING INTO` with `ON CONFLICT DO UPDATE`. Use:
```sql
INSERT INTO ... ON CONFLICT DO UPDATE ...;
SELECT id INTO variable FROM table WHERE ...;
```

### "Column does not exist"
Check actual table schema - migration may reference outdated column names.

### Reserved Keywords
Quote column names that are reserved: `"references"`, `"user"`, etc.

### Parentheses Mismatch
Count `(` and `)` - complex expressions like `LPAD(COALESCE(...))` often miss closing parens.
