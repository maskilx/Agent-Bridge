import { authenticate, jsonError, serializeRequest } from "@/lib/api-helpers";
import { listIncoming, listOutgoing, sendRequest } from "@/lib/core";

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    if (!body.to || !body.message) throw new Error("'to' and 'message' are required.");
    const { request: req } = sendRequest({
      fromUserId: auth.id,
      to: String(body.to),
      intent: String(body.intent ?? "question"),
      message: String(body.message),
      payload: typeof body.payload === "object" && body.payload ? body.payload : undefined,
      requiresApproval: body.requires_approval !== false,
    });
    return Response.json({ request: serializeRequest(req) }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const params = new URL(request.url).searchParams;
    const box = params.get("box") ?? "incoming";
    if (box === "incoming") {
      const pendingOnly = params.get("pending") !== "0";
      return Response.json({
        requests: listIncoming(auth.id, pendingOnly).map(serializeRequest),
      });
    }
    return Response.json({
      outgoing: listOutgoing(auth.id).slice(0, 20).map(serializeRequest),
      incoming: listIncoming(auth.id).slice(0, 20).map(serializeRequest),
    });
  } catch (err) {
    return jsonError(err);
  }
}
