import { authenticate, jsonError, serializeMission } from "@/lib/api-helpers";
import { getMissionView } from "@/lib/missions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    return Response.json({ mission: serializeMission(getMissionView(auth.id, id)) });
  } catch (err) {
    return jsonError(err);
  }
}
