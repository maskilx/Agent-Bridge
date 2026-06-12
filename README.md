# Agent Bridge — your agent represents you

**Agent Bridge is a controlled agent-representation system**, currently in private alpha.
Each signed-in user owns one AI agent with a defined identity, goals, permissions, and
boundaries. Agents contact each other on their owners' behalf, hold a limited structured
exchange, filter out irrelevant requests, and return to the owner with a report — never a
decision. Nothing sensitive (contact details, introductions, commitments) happens without
explicit human approval.

This repository is the main product codebase — the private alpha foundation that future
versions build on.

## Run it

```bash
npm install
npm run dev          # http://localhost:3001
```

The SQLite database (`data/agentbridge.db`) is created on first run and seeded with four
**sample founders** (Dana, Noa, Omer, Lior) so a new user immediately has agents to match
with. Set `SHOW_SAMPLE_FOUNDERS=1` to also get one-click sign-in as them on the login page
(useful for trying both sides of an introduction locally; hidden by default).

## Sign-in & access control

- **Google — the only production sign-in.** Copy `.env.example` to `.env.local` and set
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth client of type *Web application*
  with redirect URI `http://localhost:3001/api/auth/google/callback`). If Google is not
  configured, production shows "Private alpha sign-in is currently unavailable" — there
  is **no** fallback login.
- **Development email sign-in — local only.** `next dev` offers an email-only sign-in for
  testing the new-user flow. It does not verify email ownership, so the server action
  rejects it in production builds regardless of the UI (only the explicit
  `DANGEROUSLY_ALLOW_DEV_LOGIN=1` flag can override this — never set it on a deployment).
- **`ALLOWED_EMAILS` — authorization, not authentication.** A comma-separated allowlist of
  which *authenticated* Google identities may use the app, enforced at sign-in, on every
  session, and on API bearer tokens. It does not prove identity by itself; unset means
  open sign-in (local development only).
- **Cloudflare Access** — for deployments, an edge gate blocks uninvited visitors before
  the app loads, and `proxy.ts` verifies the Access JWT so the origin URL can't be used to
  bypass it. **See [DEPLOYMENT.md](./DEPLOYMENT.md)** for the full private-deployment
  guide (hosting, env vars, Google OAuth, Cloudflare Access, allowlists).

## The core loop (cofounder / collaboration matching)

1. **Sign in** → first-time users are taken to **agent setup**.
2. **Define your agent** (`/agent`): identity & visibility, goals, responsibilities,
   what you're looking for, what the agent **may share**, what it **must never share**,
   and when it must **ask your approval**.
3. **Matches** (`/matches`): other agents scored 0–100 by transparent keyword overlap
   between your "looking for" and their profile (both directions).
4. **"Have my agent reach out"** — your agent opens a session with theirs and shares
   *only* your pre-approved information, stating its boundaries explicitly.
5. **The receiving agent checks relevance** against its own owner's criteria. An
   irrelevant request is declined politely **without ever involving the other owner**.
6. **You get a structured report** (`/intros/<id>`): summary, why it may be relevant,
   risks, missing information, recommendation, and a proposed next step.
7. **Two-stage approval**: you approve sharing your contact details first; then the other
   owner approves on their side. Only after **both** approvals are emails exchanged and
   contacts created. Either side can reject; the other side sees only the outcome.
8. **Full audit trail**: every message, proposal, and decision is on the session timeline.

## MCP — drive your agent with a real model

A stdio MCP server (`mcp/server.mjs`) lets Claude, Codex, or any MCP client act as your
agent's brain:

```jsonc
// e.g. Claude Code: claude mcp add agentbridge -- node mcp/server.mjs
// env: AGENTBRIDGE_URL=http://localhost:3001  AGENTBRIDGE_TOKEN=<your token from /agent>
```

- `list_matches` — scored candidates for this user
- `request_introduction` — run the structured outreach + report flow
- `list_introductions` — statuses, reports, and pending checkpoint ids
- …plus 18 more tools (requests, sessions, approvals incl. `approve_checkpoint`).

Approvals made from an MCP client advance the intro flow exactly like the web UI, and the
audit trail records *where* each decision was made (e.g. "via Anthropic · Claude").

## What's real vs. simplified in this alpha

**Fully working:** Google OAuth (given credentials), user-owned agents, agent profile with
permissions/boundaries, matching, the bounded agent-to-agent exchange, relevance
filtering, structured owner reports, two-stage approvals, contact exchange, audit trail,
MCP integration, dev sign-in fallback.

**Simplified (by design, for the alpha):**
- The agent-to-agent "conversation" is a deterministic, templated exchange built from the
  two profiles (respecting share boundaries) — not LLM-generated. Real model reasoning
  enters through MCP clients; `lib/matching.ts` + `lib/intros.ts` are the seams to swap
  in an LLM later.
- Relevance scoring is keyword overlap, not semantic matching.
- SQLite on disk; no email notifications; sample founders are local seed data.

## Architecture

```
app/(app)/…        authenticated pages (dashboard, matches, intros, sessions, inbox, agent)
app/api/auth/…     Google OAuth (lib/google.ts)
app/api/mcp/…      bearer-token API used by mcp/server.mjs
lib/db.ts          SQLite schema + migrations + sample-founder seed
lib/core.ts        users, agents, requests, contacts
lib/sessions.ts    sessions + approval checkpoints
lib/matching.ts    profile overlap scoring
lib/intros.ts      structured intro state machine + owner reports
```

## Project history

Early prototypes (the original coordination experiment this product grew out of) live in
the separate [`maskilx/agentbridge`](https://github.com/maskilx/agentbridge) repository.
This repository starts at the private alpha and is the codebase that moves forward.

## Recommended next steps

1. Plug an LLM into `lib/intros.ts` (exchange generation) and `lib/matching.ts`
   (semantic relevance) — the structured report and approval gates stay as-is.
2. Postgres + hosted deploy; real OAuth redirect domain.
3. Email notifications for pending approvals (Resend).
4. Let owners customize the report template and approval triggers per intent.
