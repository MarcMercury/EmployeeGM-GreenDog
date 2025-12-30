# Slack Integration Documentation

## Overview

Employee GM integrates with Slack to provide seamless communication between the HR system and team messaging. This integration supports:

1. **User Synchronization** - Automatic matching of Employee GM users with Slack accounts
2. **Notifications** - One-way notification flow from Employee GM to Slack
3. **Status Tracking** - Real-time sync status and conflict management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Employee GM                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Vue/Nuxt)                                            │
│  ├── useSlack.ts         - Basic messaging composable           │
│  └── useSlackSync.ts     - Sync management composable           │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Nitro Server)                                         │
│  ├── /api/slack/send                 - Send messages            │
│  ├── /api/slack/sync/run             - Run sync                 │
│  ├── /api/slack/sync/status          - Get sync status          │
│  ├── /api/slack/sync/conflicts       - Get conflicts            │
│  ├── /api/slack/sync/resolve         - Resolve conflicts        │
│  ├── /api/slack/sync/scheduled       - Scheduled sync (cron)    │
│  ├── /api/slack/notifications/queue  - Queue notification       │
│  ├── /api/slack/notifications/process- Process queue            │
│  └── /api/slack/health               - Health check             │
├─────────────────────────────────────────────────────────────────┤
│  Database (Supabase/PostgreSQL)                                 │
│  ├── slack_sync_logs         - Sync operation history           │
│  ├── slack_sync_conflicts    - Pending conflicts                │
│  ├── notification_triggers   - Event trigger configuration      │
│  └── notification_queue      - Pending notifications            │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret

# Optional (for scheduled sync)
CRON_SECRET=your-cron-secret-for-scheduled-endpoint
```

### 2. Slack App Configuration

1. Create a Slack App at https://api.slack.com/apps
2. Add Bot Token Scopes:
   - `users:read` - Read user list
   - `users:read.email` - Read user emails
   - `chat:write` - Send messages
   - `channels:read` - List channels
   - `im:write` - Send direct messages
3. Install the app to your workspace
4. Copy the Bot User OAuth Token

### 3. Database Migration

Run the migration to create required tables:

```sql
-- Apply migration 105_slack_sync_system.sql
```

## User Synchronization

### How It Works

1. **Email Matching**: Primary identifier for matching users
2. **Status Tracking**: Each employee has a `slack_status`:
   - `linked` - Successfully matched with Slack user
   - `unlinked` - No Slack account found
   - `deactivated` - Slack user is deactivated
   - `pending_review` - Needs manual review
   - `mismatch` - Email mismatch detected

### Running Sync Manually

From the Admin UI:
1. Navigate to Admin → Slack Integration → User Sync
2. Click "Run Sync Now"

Via API:
```typescript
await $fetch('/api/slack/sync/run', {
  method: 'POST',
  body: { force: true }
})
```

### Scheduled Sync

Set up a cron job to call the scheduled endpoint every 6 hours:

```bash
# Example cron entry
0 */6 * * * curl -H "X-Cron-Secret: your-secret" https://your-app.com/api/slack/sync/scheduled
```

### Resolving Conflicts

Conflicts are created when:
- No Slack user matches the employee email
- Multiple Slack users match
- Previously linked user is no longer in Slack

Resolve via Admin UI or API:
```typescript
await $fetch('/api/slack/sync/resolve', {
  method: 'POST',
  body: {
    conflictId: 'uuid',
    action: 'link' | 'ignore' | 'manual_link',
    slackUserId: 'U12345' // for manual_link
  }
})
```

## Notifications

### Supported Event Types

| Event Type | Description | Default Target |
|------------|-------------|----------------|
| `employee_onboarding` | New employee starts | #new-hires |
| `visitor_arrival` | Visitor arrives | #visitors |
| `schedule_published` | Schedule posted | #schedule |
| `time_off_approved` | PTO approved | DM to employee |
| `time_off_requested` | PTO requested | DM to manager |
| `training_completed` | Training done | #training |
| `certification_expiring` | Cert expires soon | DM to employee |

### Sending Notifications

Using the composable:
```typescript
const { notifyNewEmployee } = useSlack()

await notifyNewEmployee({
  first_name: 'John',
  last_name: 'Doe',
  position: 'Veterinary Technician',
  start_date: '2024-01-15'
})
```

Using the API directly:
```typescript
await $fetch('/api/slack/notifications/send-event', {
  method: 'POST',
  body: {
    eventType: 'employee_onboarding',
    data: {
      employee_name: 'John Doe',
      position: 'Vet Tech',
      start_date: '2024-01-15'
    }
  }
})
```

### Message Templates

Templates support placeholders: `{{placeholder_name}}`

Example:
```
🎉 Welcome {{employee_name}} to the team! 
They are joining as {{position}} starting {{start_date}}.
```

### Processing Queue

Notifications are queued and processed in batches. Process manually:
```typescript
await $fetch('/api/slack/notifications/process', { method: 'POST' })
```

Or include in the scheduled cron job.

## Security

### Token Storage
- Tokens are stored ONLY in environment variables
- Never exposed to client-side code
- Validated format before use

### Rate Limiting
- Built-in rate limiting (50 calls/minute)
- Automatic retry with exponential backoff
- Respects Slack's `Retry-After` headers

### Audit Logging
- All API calls logged to `audit_logs` table
- Includes success/failure status
- Tracks which endpoints were called

### Access Control
- Sync management requires admin role
- Notification triggers readable by all
- Trigger management requires admin role

## Health Monitoring

Check integration health:
```bash
curl https://your-app.com/api/slack/health
```

Response includes:
- Token configuration status
- API reachability
- Authentication status
- Last sync status
- Pending notifications count
- Pending conflicts count

## Troubleshooting

### "Slack bot token not configured"
Ensure `SLACK_BOT_TOKEN` is set in environment variables.

### "User not found" errors
- Verify the user has a valid email in Slack
- Check if the email matches Employee GM records

### Notifications not sending
1. Check if trigger is enabled
2. Verify notification is in queue (`status = 'pending'`)
3. Check for errors in queue item
4. Ensure bot has channel access

### Sync taking too long
- Large workspaces may take several minutes
- Check for rate limiting (50 calls/min max)
- Consider running during off-peak hours

## API Reference

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/slack/sync/run` | Run full sync |
| GET | `/api/slack/sync/status` | Get sync status |
| GET | `/api/slack/sync/conflicts` | List conflicts |
| POST | `/api/slack/sync/resolve` | Resolve conflict |
| POST | `/api/slack/sync/link-user` | Manual link |
| GET | `/api/slack/sync/users` | List Slack users |
| GET | `/api/slack/sync/scheduled` | Cron sync |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/slack/notifications/queue` | Queue notification |
| POST | `/api/slack/notifications/process` | Process queue |
| GET | `/api/slack/notifications/triggers` | List triggers |
| PUT | `/api/slack/notifications/triggers` | Update trigger |
| POST | `/api/slack/notifications/send-event` | Send by event |

### Messaging Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/slack/send` | Send message |
| POST | `/api/slack/find-user` | Find user by email |
| GET | `/api/slack/channels` | List channels |
| GET | `/api/slack/health` | Health check |
