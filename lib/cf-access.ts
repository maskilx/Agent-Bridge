import crypto from "crypto";

/**
 * Cloudflare Access JWT verification — the EDGE layer enforced inside the app.
 *
 * When CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are set, proxy.ts requires every
 * request to carry a valid `Cf-Access-Jwt-Assertion` token (header or
 * CF_Authorization cookie). This closes the classic bypass where someone finds
 * the origin URL (e.g. *.vercel.app / *.fly.dev) and skips Cloudflare entirely:
 * without a token signed by YOUR Cloudflare team, the app returns a blank 403
 * before anything AgentBridge-branded loads.
 *
 * Env:
 *   CF_ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
 *   CF_ACCESS_AUD          the Access application's Audience (AUD) tag
 *   CF_ACCESS_JWKS_URL     optional override of the JWKS endpoint (testing)
 */

type Jwk = { kid: string; kty: string; alg?: string; n?: string; e?: string };

export function cfAccessConfigured(): boolean {
  return Boolean(process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD);
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getJwks(): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const url =
    process.env.CF_ACCESS_JWKS_URL ??
    `https://${process.env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS fetch failed (HTTP ${res.status})`);
  const data = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: data.keys ?? [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

function b64urlJson(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

/** Verify a Cloudflare Access JWT: RS256 signature against the team JWKS, audience, and expiry. */
export async function verifyAccessJwt(token: string): Promise<{ ok: boolean; email?: string }> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return { ok: false };
    const header = b64urlJson(h) as { alg?: string; kid?: string };
    const payload = b64urlJson(p) as { aud?: string | string[]; exp?: number; nbf?: number; email?: string };
    if (header.alg !== "RS256") return { ok: false };

    const jwks = await getJwks();
    const jwk = jwks.find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false };
    const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: "jwk" });
    const valid = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      publicKey,
      Buffer.from(s, "base64url")
    );
    if (!valid) return { ok: false };

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) return { ok: false };
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return { ok: false };

    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(process.env.CF_ACCESS_AUD!)) return { ok: false };

    return { ok: true, email: payload.email };
  } catch {
    return { ok: false };
  }
}
