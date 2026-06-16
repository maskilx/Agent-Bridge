# Contributing to AgentBridge

Thanks for your interest! AgentBridge is an **experimental alpha** ([MIT
licensed](./LICENSE)) — a controlled agent-representation system where each
person owns one AI agent that talks to other agents on their behalf, always
behind explicit human approval. Contributions, issues, and ideas are welcome.

Because it's early, APIs and data shapes can still change. Open an issue to
discuss anything substantial before investing in a large change.

## Getting started

Requirements: **Node 22.x** (see `.nvmrc`).

```bash
git clone https://github.com/maskilx/Agent-Bridge.git
cd Agent-Bridge
npm install
cp .env.example .env.local        # all values optional for local dev
npm run dev                       # http://localhost:3001
```

No API keys are needed to run it. With `LLM_PROVIDER` unset (or `none`), the app
uses its deterministic rule-based drafter and makes **zero** external model
calls. The SQLite database (`data/agentbridge.db`) is created and seeded with
four sample founders on first run.

Handy scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3001 |
| `npm run build` | Production build (run before opening a PR) |
| `npm run lint` | ESLint |
| `npm run db:reset` | Delete the local DB so it reseeds on next `npm run dev` |

Set `SHOW_SAMPLE_FOUNDERS=1` for one-click sign-in as the seeded founders —
useful for exercising both sides of an introduction locally.

## Project layout

- `app/` — Next.js 16 App Router (server components, server actions, API routes)
- `lib/` — core logic: agents, missions, intros, groups, matching, the model
  adapter (`lib/model.ts`), auth/access
- `components/` — UI (signed-in app + landing)
- `mcp/` — Model Context Protocol server entry
- `proxy.ts` — optional Cloudflare Access edge gate

This is Next.js 16 — server actions and nested layouts are used heavily. Match
the patterns in the surrounding files rather than older Next.js idioms.

## Principles to preserve

These are the product's invariants. A change that breaks one of them will be
asked to change, no matter how nice it is otherwise:

1. **Approval-first.** Nothing sensitive — contact details, introductions,
   commitments, scheduling — leaves the system without explicit owner approval.
   Agents return *reports and drafts*, never decisions.
2. **Privacy invariant.** Internal policy (the owner's request, boundaries,
   must-not-share list, approval rules) never leaves AgentBridge. The only text
   another agent receives is the owner-approved outreach message, verbatim — and
   it must never enumerate or hint at what is being withheld.
3. **The model never acts.** The LLM only drafts, classifies, and recommends. It
   is called **only on explicit user actions** (never on page load, render,
   polling, or background loops), is cost/timeout-capped, and **always** falls
   back to deterministic rules on any error. The app must run fully with
   `LLM_PROVIDER=none`.
4. **Keep external API usage low.** Cache, cap context, and prefer rules.

## Pull requests

1. Fork and branch from `main` (`git checkout -b feature/short-name`).
2. Keep PRs small and focused; describe the change and link any related issue.
3. Run `npm run lint` and `npm run build` before pushing — both must pass.
4. Don't introduce new external API calls or new dependencies without saying why.
5. No secrets, real personal data, or real credentials in code, tests, or
   commits — `.env*` (except `.env.example`) and `data/` are gitignored; keep it
   that way.

## Reporting security issues

Please **do not** open a public issue for security or privacy problems. Report
them privately through GitHub's **Security Advisories** ("Report a
vulnerability" on the repo's Security tab) so they can be addressed before
disclosure.

## Code of conduct

Be respectful and constructive. Assume good intent, keep discussion focused on
the work, and help keep this a welcoming project.
