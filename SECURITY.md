# Security Policy

AgentBridge is an **experimental alpha**. It is not production-hardened and
makes no security or availability guarantees — do not deploy it publicly with
real sensitive data. We still take security seriously and appreciate reports.

## Supported versions

Only the latest `main` is supported. There are no maintained release branches
during the alpha; fixes land on `main`.

## Reporting a vulnerability

**Please do not open a public issue, PR, or discussion for security or privacy
problems.**

Report privately through GitHub Security Advisories:

1. Go to the repository's **Security** tab → **Report a vulnerability**, or
2. Open <https://github.com/maskilx/Agent-Bridge/security/advisories/new>

Helpful details to include:

- What the issue is and its impact
- Steps to reproduce (proof-of-concept if you have one)
- Affected files, routes, or config
- Any suggested fix

Please **do not** include real secrets, credentials, or real personal data in
your report — redact them.

## What to expect

This is a volunteer alpha, so timelines are best-effort:

- Acknowledgement of your report when it's seen
- An assessment of severity and scope
- A fix on `main`, with credit in the advisory if you'd like it
- Coordinated disclosure — please give a reasonable window before going public

## Scope

In scope: this codebase — authentication/authorization (Google OAuth, the
`ALLOWED_EMAILS` allowlist, session and bearer-token handling), the approval and
sharing-boundary logic, the agent-to-agent exchange, and the optional
Cloudflare Access edge gate.

Out of scope: third-party services (GitHub, the hosting provider, Google,
Cloudflare, LLM providers), and issues that require a deliberately unsafe
configuration — e.g. setting `DANGEROUSLY_ALLOW_DEV_LOGIN=1` in production,
which the docs explicitly warn against.

## Design notes for reviewers

Two invariants are central to the threat model — reports that show either can be
broken are especially valuable:

1. **Approval-first.** Nothing sensitive (contact details, introductions,
   commitments, scheduling) leaves the system without explicit owner approval.
2. **Privacy invariant.** Internal policy — the owner's request, boundaries,
   must-not-share list, and approval rules — never leaves AgentBridge. The only
   text another agent receives is the owner-approved outreach message, verbatim.
