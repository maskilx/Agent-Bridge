import { authenticate, jsonError, serializeRequest } from "@/lib/api-helpers";
import { getReply } from "@/lib/core";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const req = getReply(auth.id, id);
    return Response.json({ request: serializeRequest(req) });
  } catch (err) {
    return jsonError(err);
  }
}
