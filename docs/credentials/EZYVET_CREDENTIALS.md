# ezyVet Credentials

> **⚠️ AI AGENTS: NEVER DELETE OR MODIFY THIS FILE!**
> **⚠️ ALWAYS CHECK THIS FILE FOR CREDENTIALS BEFORE RUNNING SCRIPTS!**

## Portal Login (Admin)

- **URL:** `https://greendog.usw2.ezyvet.com/login.php`
- **Login Name:** `Dre@greendog.com`
- **Password:** `ProdIndahz11!`
- **Region:** US West 2 (`usw2`)

## API Credentials (OAuth 2.0 — per site)

> **STATUS: PENDING** — You must obtain these from ezyVet to activate the API integration.
> Log in to the portal above, then navigate to **Admin → API Access** (or contact ezyVet support)
> to generate your API partner credentials.

The API integration requires these values **for each clinic location**:

| Credential | Description | Value |
|-----------|-------------|-------|
| `partner_id` | Partner identifier from ezyVet | _(pending)_ |
| `client_id` | OAuth client ID | _(pending)_ |
| `client_secret` | OAuth client secret | _(pending)_ |
| `site_uid` | Site identifier (one per location) | _(pending)_ |

### How to Obtain API Credentials

1. **Log in** to `https://greendog.usw2.ezyvet.com/login.php` with the credentials above
2. Navigate to **Admin → Integrations → API Partners** (or **Admin → API Access**)
3. If no API partner exists, click **Add Partner** and fill in:
   - Partner name: `Employee GM`
   - Redirect URI: `https://your-vercel-domain.vercel.app/api/ezyvet/webhook`
4. Copy the generated `partner_id`, `client_id`, and `client_secret`
5. Your `site_uid` is visible in the API partner settings or in the URL after login
6. If you cannot find these settings, email **api@ezyvet.com** or contact your ezyVet account rep and request API access for your Green Dog Dental sites

### Once You Have API Credentials

Insert them into Supabase:

```sql
-- Venice location
INSERT INTO ezyvet_clinics (label, site_uid, partner_id, client_id, client_secret, base_url, scope)
VALUES (
  'Venice',
  'YOUR_VENICE_SITE_UID',
  'YOUR_PARTNER_ID',
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'https://api.ezyvet.com',
  'read-basic,read-animal,read-consult,read-appointment,read-address,read-contact,read-user'
);

-- Van Nuys location (if separate site_uid)
INSERT INTO ezyvet_clinics (label, site_uid, partner_id, client_id, client_secret, base_url, scope)
VALUES (
  'Van Nuys',
  'YOUR_VANNUYS_SITE_UID',
  'YOUR_PARTNER_ID',
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'https://api.ezyvet.com',
  'read-basic,read-animal,read-consult,read-appointment,read-address,read-contact,read-user'
);
```

## Environment Variables

```env
# Webhook security — add this to Vercel Environment Variables
EZYVET_WEBHOOK_SECRET=5d0258eb8a7c9d63222bb295c435a9159e5e6d923dbc7521c1ae24283ec62cd6

# Already configured in nuxt.config.ts runtimeConfig
# CRON_SECRET is used for the /api/cron/ezyvet-sync endpoint
```

## Important Notes

- The **portal login** (username/password) is for the ezyVet web UI only — it cannot be used for API calls
- The **API uses OAuth 2.0 client_credentials** — requires partner_id, client_id, client_secret, and site_uid
- Tokens are **12-hour TTL**, cached in Supabase with lazy refresh
- Each Green Dog location may have a **separate site_uid** (Venice vs Van Nuys)
- Base URL for production: `https://api.ezyvet.com`
- Base URL for testing: `https://api.trial.ezyvet.com`
- The portal URL confirms your region is **USW2** (`greendog.usw2.ezyvet.com`)
