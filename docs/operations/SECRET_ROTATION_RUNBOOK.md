# Secret Rotation Runbook

This runbook covers rotation of credentials used by EmployeeGM-GreenDog.
Run rotations on a regular cadence (quarterly) and immediately after any
suspected exposure (committed secret, contractor offboarding, vendor breach).

## Inventory

| Secret | Where it lives | Used by | Rotation source |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env, GitHub Actions secret, local `.env` | Server routes, agents, migration scripts | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Vercel env, GitHub Actions secret, local `.env` | Browser Supabase client | Same as above |
| `EZYVET_*` (CLIENT_ID, CLIENT_SECRET, PARTNER_ID) | Vercel env | `server/utils/ezyvet/*` | ezyVet partner portal |
| `OPENAI_API_KEY` | Vercel env, GitHub Actions secret | Agent handlers | OpenAI dashboard |
| `SLACK_*` (BOT_TOKEN, SIGNING_SECRET, WEBHOOK_*) | Vercel env | `/api/slack/*` | Slack app config |
| Resend / mail keys | Vercel env | Notification senders | Resend dashboard |

> **Source of truth**: Vercel Production environment. `.env.example` in the
> repo lists the names; never the values.

## Pre-flight (do once)

1. Confirm you have:
   - Owner access to Vercel project
   - Owner/Admin on the relevant vendor (Supabase / OpenAI / etc.)
   - Push access to this repo's GitHub Actions secrets
2. Snapshot the current `git rev-parse HEAD` of `main` so you can reference
   the deploy that was running with the old key.

## Rotating the Supabase service-role key

This is the highest-risk secret — it bypasses RLS. The agent fleet, every
admin API route, and the migration scripts all use it.

### 1. Pre-rotation verification

Run the verify workflow to confirm the *current* key still works:

```
GitHub → Actions → "Verify Supabase Service-Role Key" → Run workflow
  label: pre-rotation
```

It should print `✅ Key is valid and reachable`.

### 2. Mint the new key

1. Supabase Dashboard → Project Settings → API.
2. Click **Generate new service_role key** (or rotate JWT secret if you want
   to invalidate every token; that is a heavier event — see "Full JWT
   rotation" below).
3. Copy the new key. **Do not paste into chat or the repo.**

### 3. Test the new key locally / in a scratch shell

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<new-key> \
node scripts/security/verify-supabase-key.mjs
```

You should see:

```
✅ Key is valid and reachable (HTTP 200)
```

If it fails, **stop**. Do not proceed to swap until verification passes.

### 4. Swap in production

Update in this order to minimize downtime:

1. **Vercel** → Project → Settings → Environment Variables → edit
   `SUPABASE_SERVICE_ROLE_KEY` for *Production* (and *Preview* if used).
2. **GitHub** → Repo → Settings → Secrets and variables → Actions → update
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Redeploy Vercel Production (push an empty commit or use "Redeploy" in
   the Vercel UI).
4. Once the new deploy is live, confirm `/api/agents/health` returns 200.

### 5. Post-rotation verification

Run the verify workflow again with `label: post-rotation`. Expect green.

Also smoke-test from the live app:

- Open `/admin/agents/health` — banner should be `healthy` or `degraded`
  (not `error`).
- Trigger one agent run from `/admin/agents` and confirm the run row
  reaches `status='success'`.

### 6. Invalidate the old key

If you rotated the JWT secret (full rotation) the old key is already dead.
If you only generated a new service_role key alongside the old one, click
**Revoke** on the old key in the Supabase dashboard once step 5 is green.

### 7. Update local environments

Anyone running the app locally must pull the new key into their `.env`.
Announce in the team channel; do not paste the key into chat — share via
1Password / Bitwarden / Vercel `vercel env pull`.

### 8. Audit recent code for hardcoded copies

```
git grep -nE 'eyJhbGciOi' | grep -v node_modules
```

There should be no matches. If there are, scrub history and rotate again.

## Rotating other secrets

The pattern is the same: mint → test → swap (Vercel + GH Actions) →
redeploy → verify → revoke old. The primary differences:

- **OPENAI_API_KEY**: verify with `curl https://api.openai.com/v1/models -H "Authorization: Bearer $KEY" | head`.
- **SLACK_BOT_TOKEN**: verify with `curl -H "Authorization: Bearer $KEY" https://slack.com/api/auth.test`.
- **EZYVET_CLIENT_SECRET**: trigger one ezyVet sync from `/admin/agents`
  (the `ezyvet_sync` agent) and confirm a `success` run row.

## Full Supabase JWT-secret rotation (rare)

If the JWT secret itself is compromised (not just one key leaked), rotate
the secret in Supabase → Settings → API → JWT Settings. This invalidates
**every** anon and service-role key for the project, plus every signed user
session. Plan a maintenance window. Order of operations:

1. Notify users (forced re-login).
2. Rotate JWT secret.
3. Copy the freshly-minted `anon` and `service_role` keys.
4. Update Vercel + GitHub Actions secrets for both keys.
5. Redeploy.
6. Run the verify workflow.
7. Have at least one team member sign back in as a smoke test.

## Incident response (suspected exposure)

1. Treat as if compromised — start rotation immediately.
2. In Supabase → Logs → API, filter by the leaked key prefix to assess
   blast radius (look for unexpected IPs / endpoints).
3. After rotation, file an internal incident note in `docs/audits/` with:
   timestamp, suspected vector, what data the key could read/write, and
   confirmation of step-7 verification.

## Cadence

- Quarterly rotation of Supabase service-role and OpenAI keys.
- Annual rotation of Slack bot tokens.
- Immediate rotation on any of: contributor offboarded, secret-scanning
  alert, vendor breach disclosure, suspicious activity in audit logs.

## See also

- [`.github/workflows/verify-supabase-key.yml`](../../.github/workflows/verify-supabase-key.yml)
- [`scripts/security/verify-supabase-key.mjs`](../../scripts/security/verify-supabase-key.mjs)
- [docs/credentials/](../credentials/) — vendor-specific credential notes
