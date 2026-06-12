import { currentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { decideIntro, reportFor, waitingOn } from "@/lib/intros";

/** Decide the approval an intro is waiting on (chat path) — same gates as everywhere else. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const decision = String(body.decision ?? "");
    if (!["approved", "rejected"].includes(decision))
      throw new Error("decision must be 'approved' or 'rejected'.");
    const intro = decideIntro(user.id, id, decision as "approved" | "rejected");
    return Response.json({
      intro_id: intro.id,
      status: intro.status,
      target_name: intro.target_name,
      waiting_on_you: waitingOn(intro, user.id),
      report: reportFor(intro, user.id),
    });
  } catch (err) {
    return jsonError(err);
  }
}
