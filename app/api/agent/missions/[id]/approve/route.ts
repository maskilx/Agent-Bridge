import { currentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { approveMission } from "@/lib/missions";
import { reportFor, waitingOn } from "@/lib/intros";

/** Approve a mission from the chat: launch outreach to the selected targets. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const targets = Array.isArray(body.targets) ? body.targets.map(String) : [];
    const { mission, launched } = approveMission(user.id, id, targets, {
      outreachMessage: body.outreach_message ? String(body.outreach_message) : undefined,
    });
    return Response.json({
      mission_id: mission.id,
      status: mission.status,
      launched,
      results: mission.intros.map((i) => ({
        intro_id: i.id,
        target_name: i.target_name,
        status: i.status,
        match_score: i.match_score,
        waiting_on_you: waitingOn(i, user.id),
        report: reportFor(i, user.id),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}
