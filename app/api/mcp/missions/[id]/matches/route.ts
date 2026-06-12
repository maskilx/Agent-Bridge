import { authenticate, jsonError } from "@/lib/api-helpers";
import { missionMatches } from "@/lib/missions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await ctx.params;
    const matches = missionMatches(auth.id, id).map((m) => ({
      handle: `@${m.user.handle}`,
      name: m.user.name,
      agent: m.agent.display_name,
      score: m.score,
      named_in_mission: m.named,
      why_this_fits: m.fit,
      caveats: m.caveats,
      their_goals: m.agent.goals,
      their_looking_for: m.agent.looking_for,
    }));
    return Response.json({ matches });
  } catch (err) {
    return jsonError(err);
  }
}
