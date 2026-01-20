# Scripts Directory

Utility scripts for database management, migrations, and data operations.

## Active Scripts

### Database Setup & Migrations
- **apply-migrations.mjs** - Run Supabase migrations
- **apply-ezyvet-migration.ts** / **apply-ezyvet-migration-v2.ts** - EzyVet CRM integration migrations
- **apply-role-constraint.mjs** - Apply RBAC role constraints

### User Management
- **create-admin-user.ts** - Create admin users
- **create_users.ts** - Bulk user creation
- **assign-rbac-roles.mjs** - Assign role-based access control roles
- **link-auth-to-profiles.ts** - Link Supabase auth users to profile records
- **resolve-all-pending-users.ts** - Resolve pending user accounts
- **check-pending-users.ts** - Check for users with pending status

### Authentication & Diagnostics
- **auth-diagnostic.ts** - Diagnose authentication issues
- **check-auth-status.ts** - Check user authentication status
- **deep-auth-check.ts** - Deep authentication verification

### Data Operations
- **run-backfill.ts** - Backfill data operations
- **update-employee-emails.ts** - Update employee email addresses
- **update-employees-from-csv.mjs** - Import employee updates from CSV
- **match_slack_employee_emails.ts** - Match Slack users to employees

### CRM & Referrals
- **import-contacts-to-referrals.ts** - Import contacts to referral system
- **rematch-unmatched-referrals.ts** - Re-process unmatched referrals
- **reset-and-parse-referrals.ts** - Reset and re-parse referral data

### Shadow Program
- **add-missing-shadow-candidates.ts** - Add missing shadow program candidates
- **check-shadow-data.ts** - Verify shadow program data
- **migrate-shadow-visitors-full.ts** - Migrate shadow visitors
- **move-shadow-visitors.ts** - Move shadow visitor records

### Storage
- **create-storage-bucket.ts** - Create Supabase storage buckets

### EzyVet Integration
- **check-ezyvet-tables.mjs** - Verify EzyVet CRM tables

## Archived & Deprecated

- **archive/** - Old CSV/JSON data files from past imports
- **deprecated/** - One-time migration scripts, parsers, and legacy fix scripts

## Usage

Most scripts are written in TypeScript and can be run with:

```bash
npx tsx scripts/<script-name>.ts
```

For `.mjs` scripts:

```bash
node scripts/<script-name>.mjs
```

## Safety

- Always test scripts in development first
- Review database changes before running migrations
- Keep backups before running bulk operations
- Deprecated scripts are kept for historical reference only
