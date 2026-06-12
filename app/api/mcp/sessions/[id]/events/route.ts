import { authenticate, jsonError, serializeSession, serializeSessionEvent } from "@/lib/api-helpers";
import { getSessionEvents } from "@/lib/sessions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const since = Number(new URL(request.url).searchParams.get("since") ?? 0) || 0;
    const { session, events } = getSessionEvents(id, auth.id, since);
    return Response.json({
      session: serializeSession(session),
      events: events.map(serializeSessionEvent),
    });
  } catch (err) {
    return jsonError(err);
  }
}
