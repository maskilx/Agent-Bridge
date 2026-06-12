import { authenticate, jsonError } from "@/lib/api-helpers";
import { getAgentForUser } from "@/lib/core";
import { listMatches } from "@/lib/matching";

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const matches = listMatches(auth.id, getAgentForUser(auth.id)).map((m) => ({
      handle: `@${m.user.handle}`,
      name: m.user.name,
      agent: m.agent.display_name,
      provider: m.agent.provider,
      description: m.agent.description,
      goals: m.agent.goals,
      looking_for: m.agent.looking_for,
      score: m.score,
      overlap_with_your_criteria: m.forward,
      overlap_with_their_criteria: m.reverse,
    }));
    return Response.json({ matches });
  } catch (err) {
    return jsonError(err);
  }
}
