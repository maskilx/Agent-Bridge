import { authenticate, clientVia, jsonError, serializeSession, serializeSessionEvent } from "@/lib/api-helpers";
import { sendSessionMessage } from "@/lib/sessions";
import { syncIntros } from "@/lib/intros";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const kind = String(body.kind ?? "update");
    if (!["update", "proposal", "approve", "reject"].includes(kind))
      throw new Error("kind must be one of: update, proposal, approve, reject.");
    const approver = String(body.approver ?? "peer");
    const { session, event } = sendSessionMessage({
      userId: auth.id,
      sessionId: id,
      message: String(body.message ?? ""),
      kind: kind as "update" | "proposal" | "approve" | "reject",
      approver: approver === "self" ? "self" : "peer",
      via: clientVia(request),
    });
    if (kind === "approve" || kind === "reject") syncIntros();
    return Response.json({
      session: serializeSession(session),
      event: serializeSessionEvent(event),
    });
  } catch (err) {
    return jsonError(err);
  }
}
