/**
 * Infra health endpoint for Railway (and any uptime check).
 * Returns 200 immediately: no auth, no DB, no external/LLM calls, no imports.
 * Point Railway's Healthcheck Path at /api/health.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });
}
