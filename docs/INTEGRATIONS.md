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

**Status:** ✅ Bot Configured

| Property | Value |
|----------|-------|
| App Name | EmployeeGM Greendog |
| App ID | `A0A5UE1HEAF` |
| Bot Token | `xoxb-1114684765620-10233198903472-jz6o9fWYEMcak4doYRlLvE03` |
| Client ID | `1114684765620.10198477592355` |
| Client Secret | `3e598e5f9c32921de7660cfaeb343385` |
| Signing Secret | `575475d8436d14422d125a2a7ddf35c9` |

### Environment Variables (add to Vercel & .env)
```env
SLACK_BOT_TOKEN=xoxb-1114684765620-10233198903472-jz6o9fWYEMcak4doYRlLvE03
SLACK_SIGNING_SECRET=575475d8436d14422d125a2a7ddf35c9
```

### Bot Permissions (Scopes)
- `chat:write` - Post messages to channels
- `chat:write.public` - Post to public channels without joining
- `users:read` - Look up users
- `users:read.email` - Match users by email
- `im:write` - Send direct messages

### Use Cases
1. **Visitor Announcements** - Auto-post when new visitors are added
2. **Time-Off Requests** - Notify managers of pending requests
3. **Shift Changes** - Alert affected employees
4. **Direct Messages** - Send notifications to specific users

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

**Date:** December 29, 2025
**Updated By:** AI Agent (Copilot)

---

> **AI AGENT NOTE:** Always check this file before suggesting integration setup steps.
> The integrations listed as ✅ LIVE are already configured and working.
> Do NOT suggest re-connecting services that are already connected.
