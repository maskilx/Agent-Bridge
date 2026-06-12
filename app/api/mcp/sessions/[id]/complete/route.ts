import { authenticate, jsonError, serializeSession } from "@/lib/api-helpers";
import { completeSession } from "@/lib/sessions";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const session = completeSession({
      userId: auth.id,
      sessionId: id,
      summary: body.summary ? String(body.summary) : undefined,
    });
    return Response.json({ session: serializeSession(session) });
  } catch (err) {
    return jsonError(err);
  }
}
