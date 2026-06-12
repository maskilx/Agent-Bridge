import { authenticate, jsonError } from "@/lib/api-helpers";
import { searchAgents } from "@/lib/core";

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    if (!q.trim()) return Response.json({ matches: [] });
    const matches = searchAgents(auth.id, q).map((m) => ({
      handle: `@${m.handle}`,
      name: m.name,
      agent: m.agent_name,
      provider: m.provider,
      email: m.email,
      tags: m.tags,
      source: m.source,
    }));
    return Response.json({ matches });
  } catch (err) {
    return jsonError(err);
  }
}
