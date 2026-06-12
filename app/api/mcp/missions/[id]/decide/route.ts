import { authenticate, jsonError, serializeMission } from "@/lib/api-helpers";
import { resolveRecipient } from "@/lib/core";
import { approveMission, cancelMission, completeMission, getMissionView } from "@/lib/missions";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const decision = String(body.decision ?? "");

    if (decision === "approved") {
      const refs: string[] = Array.isArray(body.targets) ? body.targets.map(String) : [];
      const targetIds = refs
        .map((ref) => resolveRecipient(auth.id, ref)?.id)
        .filter(Boolean) as string[];
      const { mission, launched } = approveMission(auth.id, id, targetIds);
      return Response.json({ mission: serializeMission(mission), launched });
    }
    if (decision === "cancelled") {
      return Response.json({ mission: serializeMission(cancelMission(auth.id, id)) });
    }
    if (decision === "completed") {
      return Response.json({
        mission: serializeMission(completeMission(auth.id, id, String(body.result_summary ?? ""))),
      });
    }
    throw new Error("decision must be 'approved' (with targets), 'cancelled', or 'completed'.");
  } catch (err) {
    return jsonError(err);
  }
}

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
