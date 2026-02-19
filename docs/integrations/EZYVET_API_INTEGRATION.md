# ezyVet API Integration

## Overview

Employee GM now has a **direct API integration** with ezyVet. This replaces manual CSV imports with live, bi-directional data sync for appointments, staff, and consults across all Green Dog Dental locations.

### Architecture

```
┌─────────────┐     OAuth 2.0        ┌──────────────┐
│  Employee GM │ ◀──────────────────▶ │  ezyVet API  │
│  (Vercel)    │     REST + Webhooks  │  (per-site)  │
└──────┬──────┘                       └──────────────┘
       │
       │ Service Role
       ▼
┌──────────────┐
│   Supabase   │  ezyvet_clinics, ezyvet_tokens,
│   Database   │  ezyvet_appointments, ezyvet_users,
│              │  ezyvet_consults, ezyvet_webhook_events,
│              │  ezyvet_api_sync_log
└──────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-site OAuth** | Each clinic (Venice, Van Nuys) has its own `site_uid` and credentials |
| **Token caching** | 12-hour tokens cached in Supabase with lazy refresh (5-min buffer) |
| **Rate limiting** | 60/min per endpoint, 180/min global, 300/min for availability — with exponential backoff |
| **Webhook receiver** | Real-time push updates from ezyVet trigger targeted syncs |
| **Pagination** | All bulk fetches use `limit=200` to minimize API calls |
| **Audit trail** | Every sync is logged in `ezyvet_api_sync_log` with full metrics |

---

## Setup Steps

### 1. Get ezyVet API Credentials

Contact ezyVet support or your account rep to obtain:
- `partner_id`
- `client_id`
- `client_secret`
- `site_uid` — one per clinic location

### 2. Insert Clinic Records into Supabase

For **each** Green Dog location, insert a row into the `ezyvet_clinics` table:

```sql
INSERT INTO ezyvet_clinics (label, site_uid, partner_id, client_id, client_secret, location_id, scope)
VALUES (
  'Venice',
  'your-venice-site-uid',
  'your-partner-id',
  'your-client-id',
  'your-client-secret',
  (SELECT id FROM locations WHERE name ILIKE '%venice%' LIMIT 1),
  'read-basic,read-animal,read-consult,read-appointment,read-address,read-contact,read-user'
);

-- Repeat for Van Nuys, etc.
```

### 3. Set Environment Variables

Add to **Vercel Environment Variables** (or `.env` for local dev):

```env
# Webhook security (generate a random secret)
EZYVET_WEBHOOK_SECRET=your-random-webhook-secret
```

### 4. Apply the Database Migration

```bash
# The migration file is at:
# supabase/migrations/210_ezyvet_api_integration.sql

# Apply via Supabase Dashboard (SQL Editor) or CLI:
npx supabase db push
```

### 5. Run First Sync

Navigate to **Marketing → ezyVet API Integration** in Employee GM.

1. Select your clinic from the dropdown
2. Click **Full Sync**
3. Watch the sync log for progress

### 6. Register Webhooks

On the same page, click **Setup Webhooks**. This registers the following events with ezyVet:

- `appointment.created` / `appointment.updated` / `appointment.deleted`
- `consult.created` / `consult.updated`
- `animal.created` / `animal.updated`

ezyVet will push updates to `https://your-domain.vercel.app/api/ezyvet/webhook`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ezyvet/clinics` | List configured clinics (admin) |
| `GET` | `/api/ezyvet/dashboard` | Summary stats for the integration |
| `POST` | `/api/ezyvet/sync` | Trigger manual sync (users/appointments/consults/full) |
| `GET` | `/api/ezyvet/sync-log` | Fetch sync history |
| `GET` | `/api/ezyvet/availability` | Real-time slot check via /ezycab |
| `POST` | `/api/ezyvet/webhook` | Receive push updates from ezyVet |
| `POST` | `/api/ezyvet/setup-webhooks` | Register webhooks with ezyVet |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `ezyvet_clinics` | Per-site API credentials and config |
| `ezyvet_tokens` | Cached OAuth tokens (one per clinic) |
| `ezyvet_api_sync_log` | Audit trail for every API sync |
| `ezyvet_appointments` | Synced appointment data (v2 endpoint) |
| `ezyvet_users` | Synced staff/user data (v4 endpoint) |
| `ezyvet_consults` | Synced consult data (v1 endpoint) |
| `ezyvet_webhook_events` | Inbound webhook event log |

---

## ezyVet API Reference

| Endpoint | Version | Use |
|----------|---------|-----|
| `POST /v1/oauth/access_token` | v1 | OAuth token |
| `GET /v4/user` | v4 | Staff/user list |
| `GET /v2/appointment` | v2 | Appointment list (preferred over v1) |
| `GET /ezycab/availability` | — | Real-time slot checking (300 calls/min) |
| `GET /v1/consult` | v1 | Consult records |
| `GET /v1/animal` | v1 | Patient/animal records |
| `POST /v1/webhooks` | v1 | Register webhooks |

### Rate Limits

- **60 calls/min** per endpoint
- **180 calls/min** global
- **300 calls/min** for `/ezycab/availability`
- On `429`: exponential backoff (1s → 2s → 4s → 8s → 16s → 32s → 60s max)

### Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| `401` | Token expired | Invalidate cache, re-authenticate |
| `403` | Scope issue | Check `scope` param in clinic config |
| `422` | Validation error | Logged to `ezyvet_api_sync_log` with messages |
| `429` | Rate limited | Exponential backoff with Retry-After header |

---

## File Structure

```
server/
  utils/
    ezyvet/
      index.ts          # Barrel export
      types.ts           # TypeScript interfaces
      auth.ts            # OAuth token management
      client.ts          # Rate-limited HTTP client
      sync.ts            # Sync services (users, appointments, consults)
  api/
    ezyvet/
      clinics.get.ts     # List clinics
      dashboard.get.ts   # Dashboard stats
      sync.post.ts       # Trigger sync
      sync-log.get.ts    # Sync history
      availability.get.ts # Real-time slots
      webhook.post.ts    # Webhook receiver
      setup-webhooks.post.ts # Register webhooks

app/
  composables/
    useEzyVetIntegration.ts  # Vue composable
  pages/
    marketing/
      ezyvet-integration.vue # Dashboard UI

supabase/
  migrations/
    210_ezyvet_api_integration.sql  # Schema
```

---

## Automating Analysis Reports

With the direct API integration, your existing analysis reports can be automated:

1. **Appointment Analysis** — Instead of CSV uploads, appointments sync directly from ezyVet to `ezyvet_appointments`. Your existing analysis at `/marketing/appointment-analysis` can pull from this table.

2. **Invoice Analysis** — Add a sync for invoice lines (endpoint: `GET /v1/invoiceline`). The data flows directly into your invoice analysis dashboard.

3. **EzyVet CRM Analytics** — The existing CSV-based import at `/marketing/ezyvet-analytics` can be supplemented with live contact data from `GET /v1/contact`.

4. **Staff Scheduling** — The `ezyvet_users` table feeds directly into your scheduling system, keeping staff rosters in sync.

### Cron-Based Automation

For fully hands-free operation, add a Vercel Cron Job:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/ezyvet-sync",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

This runs a full sync every 4 hours. Between syncs, webhooks handle real-time updates.
