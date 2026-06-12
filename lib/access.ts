/**
 * In-app access control — the SECOND layer of protection behind Cloudflare Access.
 *
 * ALLOWED_EMAILS: comma-separated emails allowed to sign in / stay signed in.
 *                 Unset = open sign-in (local development).
 * ALLOW_DEV_LOGIN: "1" shows the private-alpha email sign-in even when Google is configured.
 * SHOW_SAMPLE_FOUNDERS: "1" shows the seeded sample-founder logins (local demos only).
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

export function sampleFoundersEnabled(): boolean {
  return process.env.SHOW_SAMPLE_FOUNDERS === "1";
}

/** Sample founders are local seed identities; they may bypass the allowlist only when explicitly enabled. */
export function emailMayUseApp(email: string): boolean {
  if (email.endsWith("@agentbridge.demo")) return sampleFoundersEnabled();
  return allowedEmail(email);
}
