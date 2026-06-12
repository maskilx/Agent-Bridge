/**
 * In-app access control — the SECOND layer of protection behind Cloudflare Access.
 *
 * Two distinct concerns, kept separate on purpose:
 *  - AUTHENTICATION: proving who you are. In production that is Google OAuth only.
 *  - AUTHORIZATION: ALLOWED_EMAILS decides which authenticated identities may use
 *    the app. It is an allowlist, NOT an authentication mechanism.
 *
 * Env:
 *  ALLOWED_EMAILS: comma-separated emails allowed to sign in / stay signed in.
 *                  Unset = open sign-in (local development only).
 *  SHOW_SAMPLE_FOUNDERS: "1" shows the seeded sample-founder logins (dev only).
 *  DANGEROUSLY_ALLOW_DEV_LOGIN: "1" re-enables email-only sign-in in production.
 *                  UNSAFE — anyone who knows an allowlisted email could sign in.
 *                  Never set this on a real deployment.
 */

export function allowlistConfigured(): boolean {
  return Boolean(process.env.ALLOWED_EMAILS?.trim());
}

export function allowedEmail(email: string): boolean {
  if (!allowlistConfigured()) return true;
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/**
 * Email-only sign-in proves nothing about email ownership, so it is restricted
 * to local development (NODE_ENV !== "production"). The DANGEROUSLY_ prefix on
 * the override is deliberate: production must never rely on it.
 */
export function devLoginEnabled(): boolean {
  if (process.env.DANGEROUSLY_ALLOW_DEV_LOGIN === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function sampleFoundersEnabled(): boolean {
  return process.env.SHOW_SAMPLE_FOUNDERS === "1" && devLoginEnabled();
}

/** Sample founders are local seed identities; they may bypass the allowlist only when explicitly enabled. */
export function emailMayUseApp(email: string): boolean {
  if (email.endsWith("@agentbridge.demo")) return sampleFoundersEnabled();
  return allowedEmail(email);
}
