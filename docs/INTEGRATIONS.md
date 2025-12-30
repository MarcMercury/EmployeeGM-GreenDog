# 🔌 Green Dog Dental - Integrations Reference

> **IMPORTANT:** This file contains critical integration details for the Employee GM application.
> AI agents and developers MUST reference this file before suggesting setup steps.

---

## 📋 Integration Status Overview

| Service | Status | Purpose |
|---------|--------|---------|
| Supabase | ✅ LIVE | Database, Auth, RLS |
| Vercel | ✅ LIVE | Hosting & CI/CD |
| GoDaddy | ✅ LIVE | Email Domain (SMTP) |
| GitHub | ✅ LIVE | Version Control |
| OpenAI | ✅ CONFIGURED | AI Features (keys in Vercel) |
| Slack | ✅ CONFIGURED | Team Notifications |

---

## 🗄️ Supabase

**Status:** ✅ Fully Connected & Production Ready

| Property | Value |
|----------|-------|
| Project Name | Employee GM - Green Dog |
| Region | (check dashboard) |
| Database | PostgreSQL 15 |
| Auth Provider | Email/Password |
| RLS | Enabled on all tables |

### Environment Variables (already set in Vercel)
```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_KEY=[anon-public-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Key Tables
- `profiles` - User profiles (linked to auth.users)
- `employees` - Employee records
- `education_visitors` - Visitor CRM
- `skill_library` - 250+ skills
- `referral_partners` - Marketing partners
- 60+ total tables

### CLI Commands
```bash
# Push migrations to production
supabase db push

# Check migration status
supabase migration list

# Generate TypeScript types
supabase gen types typescript --project-id [ref] > types/database.types.ts
```

---

## ▲ Vercel

**Status:** ✅ Fully Connected & Deployed

| Property | Value |
|----------|-------|
| Project Name | EmployeeGM-GreenDog |
| Framework | Nuxt 3 |
| Build Command | `nuxt build` |
| Output Directory | `.output` |
| Node Version | 18.x |

### Custom Domain
**Production URL:** (your custom domain is configured in Vercel)

### Deployment
- **Auto-Deploy:** Connected to GitHub `main` branch
- **Preview Deploys:** Every PR gets a preview URL
- **Environment Variables:** Set in Vercel Dashboard

### Environment Variables in Vercel
All required env vars are already configured:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 📧 GoDaddy (Email Domain)

**Status:** ✅ Fully Connected

| Property | Value |
|----------|-------|
| Provider | GoDaddy |
| Purpose | Email domain for app communications |
| Integration | Connected to Supabase Auth emails |

### Supabase Auth Email Settings
- Password reset emails
- Email confirmation (if enabled)
- Magic link emails

---

## 🐙 GitHub

**Status:** ✅ Fully Connected

| Property | Value |
|----------|-------|
| Repository | MarcMercury/EmployeeGM-GreenDog |
| Default Branch | main |
| Vercel Integration | Auto-deploy on push |

---

## 💬 Slack

**Status:** ✅ Bot Configured with Full Sync System

| Property | Value |
|----------|-------|
| App Name | EmployeeGM Greendog |
| App ID | `A0A5UE1HEAF` |
| Bot Token | Configured in environment |
| Integration Features | User Sync, Notifications, Health Monitoring |

### Environment Variables (add to Vercel & .env)
```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
CRON_SECRET=optional-for-scheduled-sync
```

### Bot Permissions (Scopes)
- `chat:write` - Post messages to channels
- `chat:write.public` - Post to public channels without joining
- `users:read` - Look up users
- `users:read.email` - Match users by email
- `im:write` - Send direct messages
- `channels:read` - List available channels

### Features

#### 1. User Synchronization
Automatic matching of Employee GM users with Slack accounts:
- Email-based matching (primary identifier)
- Status tracking: linked, unlinked, deactivated, pending_review
- Conflict resolution for manual review
- Scheduled sync (every 6 hours recommended)

**Admin UI:** `/admin/slack` → User Sync tab

#### 2. Notification System
One-way notification flow from Employee GM to Slack:
- Configurable event triggers
- Message templates with placeholders
- Queue-based delivery with retry logic
- Channel and DM support

**Supported Events:**
- New employee onboarding
- Visitor arrivals
- Schedule published
- Time-off requests/approvals
- Training completion
- Certification expiring

**Admin UI:** `/admin/slack` → Notification Triggers tab

#### 3. Health Monitoring
Real-time health check endpoint: `GET /api/slack/health`

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/slack/sync/run` | Run user synchronization |
| `/api/slack/sync/status` | Get sync status & stats |
| `/api/slack/sync/conflicts` | List pending conflicts |
| `/api/slack/sync/resolve` | Resolve a conflict |
| `/api/slack/sync/scheduled` | Cron endpoint for scheduled sync |
| `/api/slack/notifications/send-event` | Send event notification |
| `/api/slack/notifications/process` | Process notification queue |
| `/api/slack/health` | Health check |

### Database Tables
- `slack_sync_logs` - Sync operation history
- `slack_sync_conflicts` - Pending conflicts
- `notification_triggers` - Event configuration
- `notification_queue` - Pending notifications

### Scheduled Tasks
Set up cron job for automated sync:
```bash
# Every 6 hours
0 */6 * * * curl -H "X-Cron-Secret: $CRON_SECRET" https://your-app.com/api/slack/sync/scheduled
```

### Documentation
Full documentation: [docs/SLACK_INTEGRATION.md](./SLACK_INTEGRATION.md)

---

## 🤖 OpenAI / ChatGPT

**Status:** ✅ API Keys Configured

| Property | Value |
|----------|-------|
| API Key | `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` |
| Admin Key | `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` |

### Environment Variables (add to Vercel & .env)
```env
OPENAI_API_KEY=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
OPENAI_ADMIN_KEY=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
```

### Planned Use Cases
1. AI-assisted scheduling recommendations
2. Skill gap analysis
3. Training content generation

---

## 🔐 Security Notes

1. **Never commit `.env` files** - Use Vercel environment variables
2. **Service Role Key** - Only used in server-side scripts, never exposed to client
3. **RLS Policies** - All tables have Row Level Security enabled
4. **Auth** - Email/password only, no social logins

---

## 📞 Support Contacts

| Service | How to Access |
|---------|---------------|
| Supabase | dashboard.supabase.com |
| Vercel | vercel.com/dashboard |
| GoDaddy | godaddy.com/account |
| GitHub | github.com/MarcMercury/EmployeeGM-GreenDog |

---

## 🔄 Last Updated

**Date:** December 30, 2025
**Updated By:** AI Agent (Copilot)
**Changes:** Added comprehensive Slack synchronization and notification system

---

> **AI AGENT NOTE:** Always check this file before suggesting integration setup steps.
> The integrations listed as ✅ LIVE are already configured and working.
> Do NOT suggest re-connecting services that are already connected.
