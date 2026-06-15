import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cfAccessConfigured, verifyAccessJwt } from "@/lib/cf-access";

/**
 * Edge gate. When Cloudflare Access env vars are set, EVERY request must carry
 * a JWT signed by your Cloudflare team — including requests that reach the
 * origin URL directly, bypassing Cloudflare's DNS. Unauthorized visitors get a
 * blank 403 with no AgentBridge branding, before any page or API loads.
 *
 * Unset env (local development) = pass-through.
 */
export async function proxy(request: NextRequest) {
  if (!cfAccessConfigured()) return NextResponse.next();

  const token =
    request.headers.get("cf-access-jwt-assertion") ??
    request.cookies.get("CF_Authorization")?.value ??
    "";
  if (token) {
    const { ok } = await verifyAccessJwt(token);
    if (ok) return NextResponse.next();
  }
  return new NextResponse("Access denied.", {
    status: 403,
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });
}

export const config = {
  // Protect everything, including static chunks and public assets — nothing
  // identifiable should load for unauthorized visitors. /api/health is exempt
  // so infra health checks (Railway) never require auth.
  matcher: ["/((?!favicon\\.ico$|api/health$).*)"],
};
