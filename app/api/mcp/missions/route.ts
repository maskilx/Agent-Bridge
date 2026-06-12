import { authenticate, jsonError, serializeMission } from "@/lib/api-helpers";
import { askAgent, listMissions } from "@/lib/missions";

export async function GET(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    return Response.json({ missions: listMissions(auth.id).map(serializeMission) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await request.json();
    const history = Array.isArray(body.history)
      ? body.history.map((h: { question?: unknown; answer?: unknown }) => ({
          question: String(h.question ?? ""),
          answer: String(h.answer ?? ""),
        }))
      : [];
    const result = await askAgent(auth.id, String(body.request ?? ""), history);
    if (result.kind === "clarify") {
      return Response.json({
        clarify: { reply: result.reply, question: result.question },
        note:
          "The request is ambiguous — ask the owner this question, then call create_mission_draft again " +
          "with the same request plus history: [{question, answer}].",
      });
    }
    return Response.json({
      mission: serializeMission(result.mission),
      agent_reply: result.reply,
      note:
        "This is a DRAFT awaiting the owner's approval — no outreach has happened. " +
        "The outreach_message is the ONLY text other agents will receive; show it to the owner. " +
        "Then approve_mission with the chosen targets (or cancel_mission).",
    });
  } catch (err) {
    return jsonError(err);
  }
}
