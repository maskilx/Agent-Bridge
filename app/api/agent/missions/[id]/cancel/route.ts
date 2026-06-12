import { currentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { cancelMission } from "@/lib/missions";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { id } = await ctx.params;
    const mission = cancelMission(user.id, id);
    return Response.json({ mission_id: mission.id, status: mission.status });
  } catch (err) {
    return jsonError(err);
  }
}
