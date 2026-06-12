import { authenticate, jsonError, serializeSession } from "@/lib/api-helpers";
import { listSessions, startSession } from "@/lib/sessions";

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    if (!body.with || !body.topic) throw new Error("'with' and 'topic' are required.");
    const session = startSession({
      userId: auth.id,
      withRef: String(body.with),
      topic: String(body.topic),
      message: body.message ? String(body.message) : undefined,
    });
    return Response.json({ session: serializeSession(session) }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const activeOnly = new URL(request.url).searchParams.get("all") !== "1";
    return Response.json({
      sessions: listSessions(auth.id, activeOnly).map(serializeSession),
    });
  } catch (err) {
    return jsonError(err);
  }
}
