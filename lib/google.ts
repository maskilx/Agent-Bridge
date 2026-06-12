import crypto from "crypto";

/**
 * Minimal Google OAuth 2.0 (authorization-code) client.
 * Configured entirely via env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL.
 * When unconfigured, the login page falls back to dev sign-in.
 */

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

function redirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

export function newOauthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
  const tokens = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Google userinfo failed: ${await infoRes.text()}`);
  const info = (await infoRes.json()) as Partial<GoogleProfile>;
  if (!info.sub || !info.email) throw new Error("Google account did not return an email address.");
  return {
    sub: info.sub,
    email: info.email,
    name: info.name ?? info.email.split("@")[0],
    picture: info.picture ?? "",
  };
}
