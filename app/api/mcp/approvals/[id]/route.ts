import { authenticate, jsonError, serializeCheckpoint } from "@/lib/api-helpers";
import { getCheckpoint } from "@/lib/sessions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    return Response.json({ checkpoint: serializeCheckpoint(getCheckpoint(auth.id, Number(id))) });
  } catch (err) {
    return jsonError(err);
  }
}
