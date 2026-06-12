# Deploying Agent Bridge privately

Goal: the app is reachable on a real URL, but **uninvited visitors never see Agent Bridge at
all** — they are blocked at the edge before any page loads.

> **Current deployment status (June 2026):** deployed to Railway with layer 3 active
> (`ALLOWED_EMAILS=adi.maskil@gmail.com`; Google OAuth is the only sign-in — until
> `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set, production shows "sign-in
> unavailable" and no one can log in). **Layers 1–2 (Cloudflare Access + JWT
> verification) are deferred until a domain is available** — Access can only protect a
> domain in your Cloudflare zone, not a `*.up.railway.app` URL. Until then the login page
> is publicly visible but nobody uninvited can sign in. Once a domain exists, follow
> sections 2–3 below; the code is already in place, only env vars are needed.

## The access model (three layers)

```
visitor ──▶ 1. Cloudflare Access (edge gate: only allowlisted emails pass)
                 │  every request gets a JWT signed by your Cloudflare team
                 ▼
            2. The app's proxy.ts verifies that JWT on EVERY request
                 (closes the "I found the origin URL" bypass — direct hits to
                  *.vercel.app / *.fly.dev etc. get a blank 403, no branding)
                 ▼
            3. In-app sign-in: Google OAuth + ALLOWED_EMAILS allowlist
                 (the product login; also revokes existing sessions)
```

Layer 1 keeps strangers out before the app loads. Layer 2 makes layer 1 unbypassable.
Layer 3 is the product's own identity — who you are *inside* AgentBridge.

---

## 1. Deploy the app

V1 uses **SQLite on local disk**, so prefer a host with a persistent volume:

### Recommended: Railway / Render / Fly.io (persistent disk)

- **Build:** `npm install && npm run build` · **Start:** `npm run start` (port 3001; set the
  host's port mapping or change `-p` in `package.json`).
- Mount a volume (e.g. at `/data`) and set `DATA_DIR=/data` so the database survives deploys.
- The repository root is the app — no project-root configuration needed.

### Vercel (works, with a caveat)

The app deploys and runs on Vercel, but the SQLite file lives on an **ephemeral** filesystem:
all users/agents/intros reset on every deploy and aren't shared between instances. Acceptable
for a look-and-feel alpha; not for real alpha data. For Vercel as the long-term home, swap
SQLite for Postgres/Turso first (see "Before a real public launch").

After deploying, set `APP_URL=https://app.yourdomain.com` (your final domain, not the host's
default URL).

## 2. Put Cloudflare Access in front (layer 1)

1. Add your domain to Cloudflare (free plan is fine) and point a subdomain at your
   deployment, **proxied** (orange cloud) — e.g. `app.yourdomain.com` → CNAME to your host.
2. In [Cloudflare Zero Trust](https://one.dash.cloudflare.com): **Access → Applications →
   Add an application → Self-hosted**.
   - Application domain: `app.yourdomain.com`
   - Identity providers: the default **One-time PIN** works immediately; optionally add
     Google as an IdP for one-click access.
3. Create the policy: **Allow** · Include → **Emails** →
   `adi.maskil@gmail.com` (add more invitees here later).
4. Note two values from the application's **Overview** tab:
   - your **team domain**, e.g. `yourteam.cloudflareaccess.com`
   - the application's **Audience (AUD) tag**

Anyone opening `app.yourdomain.com` now hits Cloudflare's login wall first. Not on the
list → they never reach the app.

## 3. Make the gate unbypassable (layer 2)

Set on the deployment:

```
CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
CF_ACCESS_AUD=<the AUD tag>
```

With these set, `proxy.ts` cryptographically verifies the `Cf-Access-Jwt-Assertion` token
(signature against your team's public keys, audience, expiry) on **every request, including
static assets**. Requests that didn't come through your Cloudflare Access application — e.g.
someone who discovered the raw `*.vercel.app` / `*.fly.dev` origin URL — get a blank
`403 Access denied.` with zero AgentBridge branding.

> Belt-and-suspenders: also enable your host's own protection where available (e.g. Vercel
> Deployment Protection) or restrict origin ingress to Cloudflare IPs.

### MCP clients through the gate

Browser users pass Access interactively. For the stdio MCP server (a non-interactive
client), create a **service token**: Zero Trust → Access → Service Auth → Create token,
then add an **Allow Service Auth** policy to the application. Run the MCP server with:

```
AGENTBRIDGE_URL=https://app.yourdomain.com
AGENTBRIDGE_TOKEN=<your AgentBridge API token>
CF_ACCESS_CLIENT_ID=<service token id>
CF_ACCESS_CLIENT_SECRET=<service token secret>
```

## 4. Google OAuth (the ONLY production authentication, layer 3)

Production has exactly one way to sign in: Google OAuth. The development email sign-in
does not verify email ownership, so the server rejects it in production builds — if
Google is not configured, the login page says "Private alpha sign-in is currently
unavailable" and **nobody can log in**. Configuring Google is therefore a required
deployment step, not an optional one:

1. [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   → Create credentials → **OAuth client ID** → type **Web application**.
2. Authorized redirect URI: `https://app.yourdomain.com/api/auth/google/callback`
   (add `http://localhost:3001/api/auth/google/callback` for local dev).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the deployment.
4. While the OAuth consent screen is in "Testing" mode, add your invitees as test users.

## 5. Allowed emails (authorization allowlist — not authentication)

```
ALLOWED_EMAILS=adi.maskil@gmail.com
```

- `ALLOWED_EMAILS` does **not** prove identity — Google OAuth does that. The allowlist
  only decides which authenticated identities may use the app.
- Comma-separated; enforced after Google sign-in, **on every session**, and on every API
  bearer token — removing an email locks that user out immediately.
- Keep this list in sync with the Cloudflare Access policy: Cloudflare decides who can see
  the site, `ALLOWED_EMAILS` decides who can use the product.

## Required environment variables (production)

| Variable | Value |
|---|---|
| `APP_URL` | `https://app.yourdomain.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **required** — the only production sign-in |
| `ALLOWED_EMAILS` | `adi.maskil@gmail.com[,more…]` |
| `CF_ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | Access application AUD tag |
| `DATA_DIR` | volume mount path, e.g. `/data` (hosts with disks) |

**Must NOT be set in production:** `DANGEROUSLY_ALLOW_DEV_LOGIN` (re-enables the
unverified email sign-in — anyone knowing an allowlisted address could log in) and
`SHOW_SAMPLE_FOUNDERS` (development-only sample identities; ignored in production
builds, but keep it unset regardless).

## Recommended production setup (today)

- Railway/Render/Fly with a persistent volume, deploying the repository root.
- `app.yourdomain.com` proxied through Cloudflare; Access app with email allowlist
  (`adi.maskil@gmail.com` to start) + service-token policy for MCP.
- All env vars above set; sample founders and dev login disabled (default).
- Verify after deploy: open the URL in a private window → you must see **Cloudflare's**
  login, never AgentBridge's. Then hit the raw origin URL directly → blank `403`.

## Before a real public launch

1. **Database**: SQLite → Postgres (or Turso/libSQL) with migrations; required for Vercel
   and for any multi-instance setup.
2. **Secrets & sessions**: replace the raw API-token session cookie with signed/rotating
   sessions; hash API tokens at rest; add CSRF protection beyond SameSite.
3. **Drop the edge gate deliberately**: removing Cloudflare Access is a launch decision —
   replace it with rate limiting, bot protection, and abuse reporting.
4. **Email**: real invitation + notification emails (approvals waiting, intro reports).
5. **Legal/ops**: privacy policy, terms, data deletion, backups for the volume.
6. **Observability**: error tracking and an audit log retention policy.
