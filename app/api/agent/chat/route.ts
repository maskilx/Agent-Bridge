import { currentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { askAgent, missionMatches, namedUsers } from "@/lib/missions";

/**
 * The web chat backend ("Ask my agent"). Cookie-authenticated — same session
 * as the rest of the app. Interprets the owner's request: either returns one
 * clarifying question, or creates a Mission Draft and returns the card data.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  try {
    const body = await request.json();
    const history = Array.isArray(body.history)
      ? body.history
          .map((h: { question?: unknown; answer?: unknown }) => ({
            question: String(h.question ?? "").slice(0, 400),
            answer: String(h.answer ?? "").slice(0, 600),
          }))
          .filter((h: { question: string; answer: string }) => h.question && h.answer)
      : [];

    const result = await askAgent(user.id, String(body.message ?? ""), history);
    if (result.kind === "clarify") {
      return Response.json({
        kind: "clarify",
        reply: result.reply,
        question: result.question,
        llmSource: result.llmSource,
        fallbackReason: result.fallbackReason,
      });
    }

    const m = result.mission;
    const matches = missionMatches(user.id, m.id).slice(0, 6);
    const namedIds = new Set(namedUsers(m.target_agent_ids).map((u) => u.id));
    const recommendedIds = new Set(namedUsers(m.recommended_agent_ids).map((u) => u.id));
    return Response.json({
      kind: "draft",
      reply: result.reply,
      llmSource: result.llmSource,
      fallbackReason: result.fallbackReason,
      mission: {
        id: m.id,
        title: m.title,
        goal: m.goal,
        target_criteria: m.target_criteria,
        allowed_to_share: m.allowed_to_share,
        must_not_share: m.must_not_share,
        approval_policy: m.approval_policy,
        expected_output: m.expected_output,
        outreach_message: m.outreach_message,
        candidates: matches.map((c) => ({
          user_id: c.user.id,
          name: c.user.name,
          handle: c.user.handle,
          score: c.score,
          named: c.named,
          recommended: recommendedIds.has(c.user.id),
          fit: c.fit,
        })),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
